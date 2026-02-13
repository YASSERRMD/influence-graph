/**
 * Database Seed Script - Run automatically on build/start
 */

import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Check if already seeded
  const existingOrgs = await prisma.organization.count();
  if (existingOrgs > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database with demo data...');

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'TechCorp Industries',
      slug: 'techcorp',
      description: 'A leading technology company specializing in AI and cloud solutions'
    }
  });

  console.log(`Created organization: ${org.name}`);

  // Create departments
  const departments = await Promise.all([
    prisma.department.create({
      data: { name: 'Executive', code: 'EXEC', description: 'Executive Leadership', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Engineering', code: 'ENG', description: 'Software Engineering', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Product', code: 'PROD', description: 'Product Management', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Marketing', code: 'MKTG', description: 'Marketing', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Sales', code: 'SALES', description: 'Sales', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Data Science', code: 'DATA', description: 'Data Science', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Design', code: 'DESIGN', description: 'Design', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'HR', code: 'HR', description: 'Human Resources', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Finance', code: 'FIN', description: 'Finance', organizationId: org.id }
    }),
    prisma.department.create({
      data: { name: 'Operations', code: 'OPS', description: 'Operations', organizationId: org.id }
    })
  ]);

  const deptMap = Object.fromEntries(departments.map(d => [d.code, d.id]));
  console.log(`Created ${departments.length} departments`);

  // Create users - comprehensive list
  const userData = [
    // Executive (2)
    { email: 'ceo@techcorp.com', name: 'Sarah Chen', role: Role.ORG_ADMIN, dept: 'EXEC', title: 'CEO' },
    { email: 'cto@techcorp.com', name: 'Michael Rodriguez', role: Role.ADMIN, dept: 'EXEC', title: 'CTO' },

    // Engineering (5)
    { email: 'eng-director@techcorp.com', name: 'Alex Thompson', role: Role.DEPT_HEAD, dept: 'ENG', title: 'Engineering Director' },
    { email: 'senior-eng@techcorp.com', name: 'David Kim', role: Role.MANAGER, dept: 'ENG', title: 'Senior Engineer' },
    { email: 'tech-lead@techcorp.com', name: 'Jennifer Liu', role: Role.MANAGER, dept: 'ENG', title: 'Tech Lead' },
    { email: 'dev1@techcorp.com', name: 'Chris Martinez', role: Role.MEMBER, dept: 'ENG', title: 'Developer' },
    { email: 'dev2@techcorp.com', name: 'Emma Wilson', role: Role.MEMBER, dept: 'ENG', title: 'Developer' },

    // Product (3)
    { email: 'product-director@techcorp.com', name: 'Rachel Green', role: Role.DEPT_HEAD, dept: 'PROD', title: 'Product Director' },
    { email: 'pm1@techcorp.com', name: 'James Brown', role: Role.MANAGER, dept: 'PROD', title: 'Product Manager' },
    { email: 'pm2@techcorp.com', name: 'Lisa Wang', role: Role.MEMBER, dept: 'PROD', title: 'Product Manager' },

    // Marketing (3)
    { email: 'marketing-director@techcorp.com', name: 'Nicole Adams', role: Role.DEPT_HEAD, dept: 'MKTG', title: 'Marketing Director' },
    { email: 'marketing1@techcorp.com', name: 'Daniel White', role: Role.MANAGER, dept: 'MKTG', title: 'Marketing Manager' },
    { email: 'marketing2@techcorp.com', name: 'Sophia Turner', role: Role.MEMBER, dept: 'MKTG', title: 'Marketing Specialist' },

    // Sales (3)
    { email: 'sales-director@techcorp.com', name: 'Robert Johnson', role: Role.DEPT_HEAD, dept: 'SALES', title: 'Sales Director' },
    { email: 'ae1@techcorp.com', name: 'Amanda Clark', role: Role.MANAGER, dept: 'SALES', title: 'Account Executive' },
    { email: 'ae2@techcorp.com', name: 'Kevin Lee', role: Role.MEMBER, dept: 'SALES', title: 'Account Executive' }
  ];

  const users = await Promise.all(
    userData.map(u => prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        organizationId: org.id,
        departmentId: deptMap[u.dept],
        jobTitle: u.title
      }
    }))
  );

  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  console.log(`Created ${users.length} users`);

  // Create influence edges
  const now = new Date();
  const createEdge = (source: string, target: string, weight: number, daysAgo: number) => {
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return prisma.influenceEdge.create({
      data: {
        sourceUserId: userMap[source],
        targetUserId: userMap[target],
        organizationId: org.id,
        weight,
        context: 'Organizational influence',
        contextType: 'ORGANIC',
        createdAt
      }
    });
  };

  const edges = await Promise.all([
    // CEO influences
    createEdge('ceo@techcorp.com', 'cto@techcorp.com', 95, 20),
    createEdge('ceo@techcorp.com', 'eng-director@techcorp.com', 70, 18),
    createEdge('ceo@techcorp.com', 'product-director@techcorp.com', 65, 24),
    createEdge('ceo@techcorp.com', 'sales-director@techcorp.com', 60, 8),
    createEdge('ceo@techcorp.com', 'marketing-director@techcorp.com', 55, 2),

    // CTO influences
    createEdge('cto@techcorp.com', 'eng-director@techcorp.com', 90, 25),
    createEdge('cto@techcorp.com', 'senior-eng@techcorp.com', 75, 21),
    createEdge('cto@techcorp.com', 'tech-lead@techcorp.com', 70, 17),

    // Engineering Director influences
    createEdge('eng-director@techcorp.com', 'senior-eng@techcorp.com', 85, 31),
    createEdge('eng-director@techcorp.com', 'tech-lead@techcorp.com', 80, 31),
    createEdge('eng-director@techcorp.com', 'dev1@techcorp.com', 60, 25),
    createEdge('eng-director@techcorp.com', 'dev2@techcorp.com', 55, 22),

    // Senior Engineer influences
    createEdge('senior-eng@techcorp.com', 'dev1@techcorp.com', 75, 25),
    createEdge('senior-eng@techcorp.com', 'dev2@techcorp.com', 70, 26),

    // Tech Lead influences
    createEdge('tech-lead@techcorp.com', 'dev1@techcorp.com', 65, 1),
    createEdge('tech-lead@techcorp.com', 'dev2@techcorp.com', 60, 9),

    // Product Director influences
    createEdge('product-director@techcorp.com', 'pm1@techcorp.com', 85, 26),
    createEdge('product-director@techcorp.com', 'pm2@techcorp.com', 75, 16),
    createEdge('product-director@techcorp.com', 'eng-director@techcorp.com', 50, 15),

    // Product Manager influences
    createEdge('pm1@techcorp.com', 'tech-lead@techcorp.com', 45, 24),
    createEdge('pm1@techcorp.com', 'dev1@techcorp.com', 35, 29),
    createEdge('pm2@techcorp.com', 'marketing2@techcorp.com', 30, 31),

    // Marketing Director influences
    createEdge('marketing-director@techcorp.com', 'marketing1@techcorp.com', 80, 9),
    createEdge('marketing-director@techcorp.com', 'marketing2@techcorp.com', 65, 12),
    createEdge('marketing-director@techcorp.com', 'sales-director@techcorp.com', 45, 27),

    // Marketing Manager influences
    createEdge('marketing1@techcorp.com', 'marketing2@techcorp.com', 55, 28),

    // Sales Director influences
    createEdge('sales-director@techcorp.com', 'ae1@techcorp.com', 80, 22),
    createEdge('sales-director@techcorp.com', 'ae2@techcorp.com', 70, 15),

    // AE influences
    createEdge('ae1@techcorp.com', 'pm1@techcorp.com', 40, 23),
    createEdge('ae2@techcorp.com', 'dev2@techcorp.com', 25, 28),

    // Developer peer influence
    createEdge('dev1@techcorp.com', 'dev2@techcorp.com', 50, 28)
  ]);

  console.log(`Created ${edges.length} influence edges`);

  // Create initial influence scores
  await Promise.all(users.map(user => 
    prisma.influenceScore.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        score: Math.random() * 50 + 10,
        rawScore: Math.random() * 30 + 5,
        volatility: Math.random() * 10,
        scoreType: 'COMPOSITE'
      }
    })
  ));

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
