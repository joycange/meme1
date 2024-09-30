// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// ►► denotes the node that the user wants to execute to
// XX denotes that the node is disabled
// PD denotes that the node has pinned data

import { NodeConnectionType } from 'n8n-workflow';

import { createNodeData, defaultWorkflowParameter } from './helpers';
import { DirectedGraph } from '../DirectedGraph';

describe('DirectedGraph', () => {
	//     ┌─────┐    ┌─────┐   ┌─────┐
	//  ┌─►│node1├───►│node2├──►│node3├─┐
	//  │  └─────┘    └─────┘   └─────┘ │
	//  │                               │
	//  └───────────────────────────────┘
	test('roundtrip', () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'Node1' });
		const node2 = createNodeData({ name: 'Node2' });
		const node3 = createNodeData({ name: 'Node3' });

		// ACT
		const graph = new DirectedGraph()
			.addNodes(node1, node2, node3)
			.addConnections(
				{ from: node1, to: node2 },
				{ from: node2, to: node3 },
				{ from: node3, to: node1 },
			);

		// ASSERT
		expect(DirectedGraph.fromWorkflow(graph.toWorkflow({ ...defaultWorkflowParameter }))).toEqual(
			graph,
		);
	});

	describe('getChildren', () => {
		// ┌─────┐    ┌─────┐   ┌─────┐
		// │node1├───►│node2├──►│node3│
		// └─────┘    └─────┘   └─────┘
		test('returns all children', () => {
			// ARRANGE
			const node1 = createNodeData({ name: 'Node1' });
			const node2 = createNodeData({ name: 'Node2' });
			const node3 = createNodeData({ name: 'Node3' });
			const graph = new DirectedGraph()
				.addNodes(node1, node2, node3)
				.addConnections({ from: node1, to: node2 }, { from: node2, to: node3 });

			// ACT
			const children = graph.getChildren(node1);

			// ASSERT
			expect(children.size).toBe(2);
			expect(children).toEqual(new Set([node2, node3]));
		});

		//     ┌─────┐    ┌─────┐   ┌─────┐
		//  ┌─►│node1├───►│node2├──►│node3├─┐
		//  │  └─────┘    └─────┘   └─────┘ │
		//  │                               │
		//  └───────────────────────────────┘
		test('terminates when finding a cycle', () => {
			// ARRANGE
			const node1 = createNodeData({ name: 'Node1' });
			const node2 = createNodeData({ name: 'Node2' });
			const node3 = createNodeData({ name: 'Node3' });
			const graph = new DirectedGraph()
				.addNodes(node1, node2, node3)
				.addConnections(
					{ from: node1, to: node2 },
					{ from: node2, to: node3 },
					{ from: node3, to: node1 },
				);

			// ACT
			const children = graph.getChildren(node1);

			// ASSERT
			expect(children.size).toBe(3);
			expect(children).toEqual(new Set([node1, node2, node3]));
		});
	});

	describe('removeNode', () => {
		//              XX
		//  ┌─────┐    ┌─────┐   ┌─────┐
		//  │node0├───►│node1├──►│node2│
		//  └─────┘    └─────┘   └─────┘
		// turns into
		//  ┌─────┐              ┌─────┐
		//  │node0│              │node2│
		//  └─────┘              └─────┘
		test('remove node and all connections', () => {
			// ARRANGE
			const node0 = createNodeData({ name: 'node0' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const graph = new DirectedGraph()
				.addNodes(node0, node1, node2)
				.addConnections({ from: node0, to: node1 }, { from: node0, to: node2 });

			// ACT
			graph.removeNode(node1);

			// ASSERT
			expect(graph).toEqual(
				new DirectedGraph().addNodes(node0, node2).addConnections({ from: node0, to: node2 }),
			);
		});

		//              XX
		//  ┌─────┐    ┌─────┐   ┌─────┐
		//  │node0├───►│node1├──►│node2│
		//  └─────┘    └─────┘   └─────┘
		// turns into
		//  ┌─────┐   ┌─────┐
		//  │node0├──►│node2│
		//  └─────┘   └─────┘
		test('remove node, but reconnect connections', () => {
			// ARRANGE
			const node0 = createNodeData({ name: 'node0' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const graph = new DirectedGraph()
				.addNodes(node0, node1, node2)
				.addConnections({ from: node0, to: node1 }, { from: node1, to: node2 });

			// ACT
			const newConnections = graph.removeNode(node1, { reconnectConnections: true });

			// ASSERT
			expect(newConnections).toHaveLength(1);
			expect(newConnections[0]).toEqual({
				from: node0,
				outputIndex: 0,
				type: NodeConnectionType.Main,
				inputIndex: 0,
				to: node2,
			});
			expect(graph).toEqual(
				new DirectedGraph().addNodes(node0, node2).addConnections({ from: node0, to: node2 }),
			);
		});

		//               XX
		//  ┌─────┐     ┌─────┐     ┌─────┐
		//  │     │o   o│     │o   o│     │
		//  │     │o─┐ o│     │o   o│     │
		//  │node0│o └►o│node1│o   o│node2│
		//  │     │o   o│     │o─┐ o│     │
		//  │     │o   o│     │o └►o│     │
		//  └─────┘     └─────┘     └─────┘
		// turns into
		//  ┌─────┐                 ┌─────┐
		//  │     │o               o│     │
		//  │     │o───────┐       o│     │
		//  │node0│o       │       o│node2│
		//  │     │o       │       o│     │
		//  │     │o       └──────►o│     │
		//  └─────┘                 └─────┘
		test('remove node, reconnect connections and retaining the input indexes', () => {
			// ARRANGE
			const node0 = createNodeData({ name: 'node0' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const graph = new DirectedGraph()
				.addNodes(node0, node1, node2)
				.addConnections(
					{ from: node0, outputIndex: 1, inputIndex: 2, to: node1 },
					{ from: node1, outputIndex: 3, inputIndex: 4, to: node2 },
				);

			// ACT
			const newConnections = graph.removeNode(node1, { reconnectConnections: true });

			// ASSERT
			expect(newConnections).toHaveLength(1);
			expect(newConnections[0]).toEqual({
				from: node0,
				outputIndex: 1,
				type: NodeConnectionType.Main,
				inputIndex: 4,
				to: node2,
			});
			expect(graph).toEqual(
				new DirectedGraph()
					.addNodes(node0, node2)
					.addConnections({ from: node0, outputIndex: 1, inputIndex: 4, to: node2 }),
			);
		});

		//  ┌─────┐                ┌──────┐
		//  │left0├─┐   XX       ┌►│right0│
		//  └─────┘ │  ┌──────┐  │ └──────┘
		//          ├─►│center├──┤
		//  ┌─────┐ │  └──────┘  │ ┌──────┐
		//  │left1├─┘            └►│right1│
		//  └─────┘                └──────┘
		// turns into
		//
		//  ┌─────┐                ┌──────┐
		//  │left0├─┐           ┌─►│right0│
		//  └─────┘ │           │  └──────┘
		//          ├───────────┤
		//  ┌─────┐ │           │  ┌──────┐
		//  │left1├─┘           └─►│right1│
		//  └─────┘                └──────┘
		test('remove node, reconnect connections and multiplexes them', () => {
			// ARRANGE
			const left0 = createNodeData({ name: 'left0' });
			const left1 = createNodeData({ name: 'left1' });
			const center = createNodeData({ name: 'center' });
			const right0 = createNodeData({ name: 'right0' });
			const right1 = createNodeData({ name: 'right1' });
			const graph = new DirectedGraph()
				.addNodes(left0, left1, center, right0, right1)
				.addConnections(
					{ from: left0, to: center },
					{ from: left1, to: center },
					{ from: center, to: right0 },
					{ from: center, to: right1 },
				);

			// ACT
			const newConnections = graph.removeNode(center, { reconnectConnections: true });

			// ASSERT
			const expectedGraph = new DirectedGraph()
				.addNodes(left0, left1, right0, right1)
				.addConnections(
					{ from: left0, to: right0 },
					{ from: left0, to: right1 },
					{ from: left1, to: right0 },
					{ from: left1, to: right1 },
				);
			expect(newConnections).toHaveLength(4);
			expect(newConnections).toEqual(expectedGraph.getConnections());
			expect(graph).toEqual(expectedGraph);
		});
	});
});
