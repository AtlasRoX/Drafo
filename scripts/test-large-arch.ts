async function testLargeArchitecture() {
  const prompt = `Create a multi-tenant SaaS architecture with:
Frontend: Web App, Mobile App
API Gateway
Backend Services: Authentication, RBAC, Tenant Service, User Service, Project Service, Task Service, Comment Service, File Service, Notification Service, Realtime Service, Billing Service, Search Service, Analytics Service, Audit Log Service
Infrastructure: Redis Cache, Message Queue, Background Worker
Data Layer: PostgreSQL Primary, Object Storage, Search Index, Analytics DB`;

  console.log('Sending large architecture request to /api/ai/generate...');
  const res = await fetch('http://localhost:3000/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Success:', data.success);
  console.log('Total nodes:', data.project?.nodes?.length);
  console.log('Total edges:', data.project?.edges?.length);
  console.log('Summary:', data.summary);
  console.log('Generated node titles:');
  data.project?.nodes?.forEach((n: any) => console.log(`  - [${n.type}] ${n.title} (x: ${n.x}, y: ${n.y})`));
}

testLargeArchitecture().catch(console.error);
