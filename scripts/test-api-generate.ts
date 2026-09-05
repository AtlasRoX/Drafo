async function testApi() {
  const baseNodes = [
    { id: 'auth-1', type: 'browser', title: 'Client Browser', subtitle: 'React UI', x: 60, y: 140 },
    { id: 'auth-2', type: 'gateway', title: 'API Gateway', subtitle: 'Rate Limiting', x: 300, y: 140 },
    { id: 'auth-3', type: 'auth', title: 'Auth Service', subtitle: 'JWT Signer', x: 550, y: 140 },
    { id: 'auth-4', type: 'cache', title: 'Redis Cache', subtitle: 'Active Sessions', x: 800, y: 80 },
    { id: 'auth-5', type: 'database', title: 'Users DB', subtitle: 'PostgreSQL Primary', x: 800, y: 220 }
  ];
  const baseEdges = [
    { id: 'ae-1', from: 'auth-1', to: 'auth-2', label: '1. POST /login' },
    { id: 'ae-2', from: 'auth-2', to: 'auth-3', label: '2. Forward Request' },
    { id: 'ae-3', from: 'auth-3', to: 'auth-4', label: '3. Check Cache' },
    { id: 'ae-4', from: 'auth-3', to: 'auth-5', label: '4. Verify Password Hash' }
  ];

  console.log('Sending request to http://localhost:3000/api/ai/generate...');
  const res = await fetch('http://localhost:3000/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Do not remove or replace existing components. Add RBAC, User Service, PostgreSQL Replica, and connect Auth Service to RBAC.',
      currentGraph: {
        nodes: baseNodes,
        edges: baseEdges
      }
    })
  });

  const data = await res.json();
  console.log('Response status:', res.status);
  console.log('Success:', data.success);
  console.log('IsDelta:', data.isDelta);
  console.log('Summary:', data.summary);
  console.log('Operations count:', data.operations?.length);
  console.log('Total nodes in result project:', data.project?.nodes?.length);
  console.log('Nodes in project:', data.project?.nodes?.map((n: any) => `${n.title} (${n.id}) at (${n.x}, ${n.y})`));
}

testApi().catch(console.error);
