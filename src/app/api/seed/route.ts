/**
 * Seed API - Initialize comprehensive demo data for Influence Graph Platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Check if already seeded
    const existingOrgs = await db.organization.count();
    if (existingOrgs > 0) {
      return NextResponse.json({
        message: 'Database already seeded',
        seeded: false
      });
    }

    // Create multiple organizations for multi-tenant demo
    const organizations = await Promise.all([
      db.organization.create({
        data: {
          name: 'TechCorp Industries',
          slug: 'techcorp',
          description: 'A leading technology company specializing in AI and cloud solutions'
        }
      }),
      db.organization.create({
        data: {
          name: 'Global Finance Group',
          slug: 'globalfinance',
          description: 'International financial services and investment firm'
        }
      })
    ]);

    const org = organizations[0]; // Primary demo org

    // Create extensive departments
    const departments = await Promise.all([
      // TechCorp departments
      db.department.create({
        data: {
          name: 'Executive Leadership',
          code: 'EXEC',
          description: 'C-Suite and senior leadership team',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Engineering',
          code: 'ENG',
          description: 'Software Engineering and Development',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Product Management',
          code: 'PROD',
          description: 'Product strategy and management',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Data Science',
          code: 'DATA',
          description: 'Data analytics and machine learning',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Design',
          code: 'DESIGN',
          description: 'UI/UX Design and user research',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Sales',
          code: 'SALES',
          description: 'Sales and revenue operations',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Marketing',
          code: 'MKTG',
          description: 'Marketing and communications',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Human Resources',
          code: 'HR',
          description: 'People operations and culture',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Finance',
          code: 'FIN',
          description: 'Finance and accounting',
          organizationId: org.id
        }
      }),
      db.department.create({
        data: {
          name: 'Operations',
          code: 'OPS',
          description: 'Business operations and strategy',
          organizationId: org.id
        }
      })
    ]);

    const deptMap = Object.fromEntries(departments.map(d => [d.code, d.id]));

    // Create extensive users with varied roles
    const userData = [
      // Executive Leadership (5 members)
      { email: 'ceo@techcorp.com', name: 'Sarah Chen', role: Role.ORG_ADMIN, dept: 'EXEC', title: 'Chief Executive Officer' },
      { email: 'cto@techcorp.com', name: 'Michael Rodriguez', role: Role.ADMIN, dept: 'EXEC', title: 'Chief Technology Officer' },
      { email: 'cfo@techcorp.com', name: 'Amanda Foster', role: Role.DEPT_HEAD, dept: 'EXEC', title: 'Chief Financial Officer' },
      { email: 'coo@techcorp.com', name: 'James Mitchell', role: Role.DEPT_HEAD, dept: 'EXEC', title: 'Chief Operating Officer' },
      { email: 'cio@techcorp.com', name: 'Linda Wang', role: Role.MANAGER, dept: 'EXEC', title: 'Chief Information Officer' },

      // Engineering (20 members)
      { email: 'eng-vp@techcorp.com', name: 'David Kim', role: Role.DEPT_HEAD, dept: 'ENG', title: 'VP of Engineering' },
      { email: 'eng-director1@techcorp.com', name: 'Jennifer Liu', role: Role.MANAGER, dept: 'ENG', title: 'Engineering Director - Platform' },
      { email: 'eng-director2@techcorp.com', name: 'Robert Thompson', role: Role.MANAGER, dept: 'ENG', title: 'Engineering Director - Infrastructure' },
      { email: 'eng-manager1@techcorp.com', name: 'Emily Davis', role: Role.MANAGER, dept: 'ENG', title: 'Engineering Manager - Frontend' },
      { email: 'eng-manager2@techcorp.com', name: 'Chris Martinez', role: Role.MANAGER, dept: 'ENG', title: 'Engineering Manager - Backend' },
      { email: 'eng-manager3@techcorp.com', name: 'Sophia Anderson', role: Role.MANAGER, dept: 'ENG', title: 'Engineering Manager - Mobile' },
      { email: 'tech-lead1@techcorp.com', name: 'Daniel White', role: Role.MEMBER, dept: 'ENG', title: 'Tech Lead - Core Platform' },
      { email: 'tech-lead2@techcorp.com', name: 'Olivia Brown', role: Role.MEMBER, dept: 'ENG', title: 'Tech Lead - API Services' },
      { email: 'tech-lead3@techcorp.com', name: 'Alexander Johnson', role: Role.MEMBER, dept: 'ENG', title: 'Tech Lead - Cloud' },
      { email: 'sr-dev1@techcorp.com', name: 'Mia Taylor', role: Role.MEMBER, dept: 'ENG', title: 'Senior Software Engineer' },
      { email: 'sr-dev2@techcorp.com', name: 'William Harris', role: Role.MEMBER, dept: 'ENG', title: 'Senior Software Engineer' },
      { email: 'sr-dev3@techcorp.com', name: 'Charlotte Martin', role: Role.MEMBER, dept: 'ENG', title: 'Senior Software Engineer' },
      { email: 'sr-dev4@techcorp.com', name: 'Benjamin Garcia', role: Role.MEMBER, dept: 'ENG', title: 'Senior Software Engineer' },
      { email: 'dev1@techcorp.com', name: 'Ava Robinson', role: Role.MEMBER, dept: 'ENG', title: 'Software Engineer' },
      { email: 'dev2@techcorp.com', name: 'Lucas Clark', role: Role.MEMBER, dept: 'ENG', title: 'Software Engineer' },
      { email: 'dev3@techcorp.com', name: 'Harper Lewis', role: Role.MEMBER, dept: 'ENG', title: 'Software Engineer' },
      { email: 'dev4@techcorp.com', name: 'Henry Walker', role: Role.MEMBER, dept: 'ENG', title: 'Software Engineer' },
      { email: 'dev5@techcorp.com', name: 'Evelyn Hall', role: Role.MEMBER, dept: 'ENG', title: 'Software Engineer' },
      { email: 'dev6@techcorp.com', name: 'Jack Allen', role: Role.MEMBER, dept: 'ENG', title: 'Software Engineer' },
      { email: 'devops-lead@techcorp.com', name: 'Victoria Young', role: Role.MANAGER, dept: 'ENG', title: 'DevOps Lead' },

      // Product Management (10 members)
      { email: 'product-vp@techcorp.com', name: 'Rachel Green', role: Role.DEPT_HEAD, dept: 'PROD', title: 'VP of Product' },
      { email: 'product-director@techcorp.com', name: 'Andrew Scott', role: Role.MANAGER, dept: 'PROD', title: 'Director of Product' },
      { email: 'senior-pm1@techcorp.com', name: 'Natalie Adams', role: Role.MANAGER, dept: 'PROD', title: 'Senior Product Manager' },
      { email: 'senior-pm2@techcorp.com', name: 'Ryan Nelson', role: Role.MANAGER, dept: 'PROD', title: 'Senior Product Manager' },
      { email: 'pm1@techcorp.com', name: 'Isabella Hill', role: Role.MEMBER, dept: 'PROD', title: 'Product Manager' },
      { email: 'pm2@techcorp.com', name: 'Ethan Moore', role: Role.MEMBER, dept: 'PROD', title: 'Product Manager' },
      { email: 'pm3@techcorp.com', name: 'Grace Turner', role: Role.MEMBER, dept: 'PROD', title: 'Product Manager' },
      { email: 'po1@techcorp.com', name: 'Liam Phillips', role: Role.MEMBER, dept: 'PROD', title: 'Product Owner' },
      { email: 'po2@techcorp.com', name: 'Chloe Campbell', role: Role.MEMBER, dept: 'PROD', title: 'Product Owner' },
      { email: 'ux-pm@techcorp.com', name: 'Noah Parker', role: Role.MEMBER, dept: 'PROD', title: 'UX Product Manager' },

      // Data Science (12 members)
      { email: 'data-vp@techcorp.com', name: 'Katherine Evans', role: Role.DEPT_HEAD, dept: 'DATA', title: 'VP of Data Science' },
      { email: 'data-director@techcorp.com', name: 'Sebastian Wright', role: Role.MANAGER, dept: 'DATA', title: 'Director of Data Science' },
      { email: 'ml-lead@techcorp.com', name: 'Aurora Collins', role: Role.MANAGER, dept: 'DATA', title: 'ML Engineering Lead' },
      { email: 'analytics-lead@techcorp.com', name: 'Oscar Stewart', role: Role.MANAGER, dept: 'DATA', title: 'Analytics Lead' },
      { email: 'sr-data-scientist1@techcorp.com', name: 'Lily Sanchez', role: Role.MEMBER, dept: 'DATA', title: 'Senior Data Scientist' },
      { email: 'sr-data-scientist2@techcorp.com', name: 'Carter Morris', role: Role.MEMBER, dept: 'DATA', title: 'Senior Data Scientist' },
      { email: 'data-scientist1@techcorp.com', name: 'Zoey Rogers', role: Role.MEMBER, dept: 'DATA', title: 'Data Scientist' },
      { email: 'data-scientist2@techcorp.com', name: 'Dylan Reed', role: Role.MEMBER, dept: 'DATA', title: 'Data Scientist' },
      { email: 'data-scientist3@techcorp.com', name: 'Hannah Cook', role: Role.MEMBER, dept: 'DATA', title: 'Data Scientist' },
      { email: 'ml-engineer1@techcorp.com', name: 'Jayden Bailey', role: Role.MEMBER, dept: 'DATA', title: 'ML Engineer' },
      { email: 'ml-engineer2@techcorp.com', name: 'Penelope Rivera', role: Role.MEMBER, dept: 'DATA', title: 'ML Engineer' },
      { email: 'data-analyst@techcorp.com', name: 'Caleb Cooper', role: Role.MEMBER, dept: 'DATA', title: 'Data Analyst' },

      // Design (8 members)
      { email: 'design-vp@techcorp.com', name: 'Stella Richardson', role: Role.DEPT_HEAD, dept: 'DESIGN', title: 'VP of Design' },
      { email: 'design-director@techcorp.com', name: 'Mason Cox', role: Role.MANAGER, dept: 'DESIGN', title: 'Design Director' },
      { email: 'ux-lead@techcorp.com', name: 'Violet Howard', role: Role.MANAGER, dept: 'DESIGN', title: 'UX Lead' },
      { email: 'ui-lead@techcorp.com', name: 'Elijah Ward', role: Role.MANAGER, dept: 'DESIGN', title: 'UI Lead' },
      { email: 'sr-designer1@techcorp.com', name: 'Luna Torres', role: Role.MEMBER, dept: 'DESIGN', title: 'Senior Product Designer' },
      { email: 'sr-designer2@techcorp.com', name: 'Logan Peterson', role: Role.MEMBER, dept: 'DESIGN', title: 'Senior Product Designer' },
      { email: 'designer1@techcorp.com', name: 'Ivy Gray', role: Role.MEMBER, dept: 'DESIGN', title: 'Product Designer' },
      { email: 'designer2@techcorp.com', name: 'Owen Ramirez', role: Role.MEMBER, dept: 'DESIGN', title: 'Product Designer' },

      // Sales (15 members)
      { email: 'sales-vp@techcorp.com', name: 'Ruby James', role: Role.DEPT_HEAD, dept: 'SALES', title: 'VP of Sales' },
      { email: 'sales-director-na@techcorp.com', name: 'Leo Watson', role: Role.MANAGER, dept: 'SALES', title: 'Sales Director - North America' },
      { email: 'sales-director-eu@techcorp.com', name: 'Alice Brooks', role: Role.MANAGER, dept: 'SALES', title: 'Sales Director - Europe' },
      { email: 'sales-director-apac@techcorp.com', name: 'Maxwell Kelly', role: Role.MANAGER, dept: 'SALES', title: 'Sales Director - APAC' },
      { email: 'enterprise-ae1@techcorp.com', name: 'Ella Sanders', role: Role.MANAGER, dept: 'SALES', title: 'Enterprise Account Executive' },
      { email: 'enterprise-ae2@techcorp.com', name: 'Aiden Price', role: Role.MEMBER, dept: 'SALES', title: 'Enterprise Account Executive' },
      { email: 'enterprise-ae3@techcorp.com', name: 'Scarlett Bennett', role: Role.MEMBER, dept: 'SALES', title: 'Enterprise Account Executive' },
      { email: 'midmarket-ae1@techcorp.com', name: 'Lucas Wood', role: Role.MEMBER, dept: 'SALES', title: 'Mid-Market Account Executive' },
      { email: 'midmarket-ae2@techcorp.com', name: 'Chloe Barnes', role: Role.MEMBER, dept: 'SALES', title: 'Mid-Market Account Executive' },
      { email: 'midmarket-ae3@techcorp.com', name: 'Jackson Ross', role: Role.MEMBER, dept: 'SALES', title: 'Mid-Market Account Executive' },
      { email: 'sdr-lead@techcorp.com', name: 'Layla Henderson', role: Role.MANAGER, dept: 'SALES', title: 'SDR Team Lead' },
      { email: 'sdr1@techcorp.com', name: 'Cameron Jenkins', role: Role.MEMBER, dept: 'SALES', title: 'Sales Development Rep' },
      { email: 'sdr2@techcorp.com', name: 'Paisley Perry', role: Role.MEMBER, dept: 'SALES', title: 'Sales Development Rep' },
      { email: 'sdr3@techcorp.com', name: 'Hunter Powell', role: Role.MEMBER, dept: 'SALES', title: 'Sales Development Rep' },
      { email: 'sales-ops@techcorp.com', name: 'Savannah Long', role: Role.MEMBER, dept: 'SALES', title: 'Sales Operations' },

      // Marketing (10 members)
      { email: 'marketing-vp@techcorp.com', name: 'Genesis Patterson', role: Role.DEPT_HEAD, dept: 'MKTG', title: 'VP of Marketing' },
      { email: 'marketing-director@techcorp.com', name: 'Brayden Hughes', role: Role.MANAGER, dept: 'MKTG', title: 'Marketing Director' },
      { email: 'demand-gen@techcorp.com', name: 'Autumn Flores', role: Role.MANAGER, dept: 'MKTG', title: 'Demand Generation Manager' },
      { email: 'content-lead@techcorp.com', name: 'Xavier Washington', role: Role.MANAGER, dept: 'MKTG', title: 'Content Marketing Lead' },
      { email: 'brand-manager@techcorp.com', name: 'Serenity Butler', role: Role.MEMBER, dept: 'MKTG', title: 'Brand Manager' },
      { email: 'digital-marketing@techcorp.com', name: 'Miles Simmons', role: Role.MEMBER, dept: 'MKTG', title: 'Digital Marketing Manager' },
      { email: 'content-writer1@techcorp.com', name: 'Nevaeh Foster', role: Role.MEMBER, dept: 'MKTG', title: 'Content Writer' },
      { email: 'content-writer2@techcorp.com', name: 'Jordan Gonzales', role: Role.MEMBER, dept: 'MKTG', title: 'Content Writer' },
      { email: 'social-media@techcorp.com', name: 'Catalina Bryant', role: Role.MEMBER, dept: 'MKTG', title: 'Social Media Manager' },
      { email: 'events-manager@techcorp.com', name: 'Reed Alexander', role: Role.MEMBER, dept: 'MKTG', title: 'Events Manager' },

      // Human Resources (7 members)
      { email: 'hr-vp@techcorp.com', name: 'Demi Russell', role: Role.DEPT_HEAD, dept: 'HR', title: 'VP of Human Resources' },
      { email: 'hr-director@techcorp.com', name: 'Kendall Griffin', role: Role.MANAGER, dept: 'HR', title: 'HR Director' },
      { email: 'talent-acquisition@techcorp.com', name: 'Brook Diaz', role: Role.MANAGER, dept: 'HR', title: 'Talent Acquisition Lead' },
      { email: 'hr-bp1@techcorp.com', name: 'Ellis Hayes', role: Role.MEMBER, dept: 'HR', title: 'HR Business Partner' },
      { email: 'hr-bp2@techcorp.com', name: 'Makayla Myers', role: Role.MEMBER, dept: 'HR', title: 'HR Business Partner' },
      { email: 'recruiter1@techcorp.com', name: 'Jonah Ford', role: Role.MEMBER, dept: 'HR', title: 'Technical Recruiter' },
      { email: 'recruiter2@techcorp.com', name: 'Harley Hamilton', role: Role.MEMBER, dept: 'HR', title: 'Technical Recruiter' },

      // Finance (8 members)
      { email: 'finance-director@techcorp.com', name: 'Finnegan Graham', role: Role.DEPT_HEAD, dept: 'FIN', title: 'Finance Director' },
      { email: 'controller@techcorp.com', name: 'Marley Sullivan', role: Role.MANAGER, dept: 'FIN', title: 'Controller' },
      { email: 'fp-a-lead@techcorp.com', name: 'Phoenix Wallace', role: Role.MANAGER, dept: 'FIN', title: 'FP&A Lead' },
      { email: 'accounting-manager@techcorp.com', name: 'Rory Woods', role: Role.MEMBER, dept: 'FIN', title: 'Accounting Manager' },
      { email: 'senior-analyst@techcorp.com', name: 'Skyler Cole', role: Role.MEMBER, dept: 'FIN', title: 'Senior Financial Analyst' },
      { email: 'staff-accountant@techcorp.com', name: 'Rowan West', role: Role.MEMBER, dept: 'FIN', title: 'Staff Accountant' },
      { email: 'ar-specialist@techcorp.com', name: 'Amari Wilkinson', role: Role.MEMBER, dept: 'FIN', title: 'AR Specialist' },
      { email: 'ap-specialist@techcorp.com', name: 'Remy Thornton', role: Role.MEMBER, dept: 'FIN', title: 'AP Specialist' },

      // Operations (7 members)
      { email: 'ops-director@techcorp.com', name: 'Casey Chen', role: Role.DEPT_HEAD, dept: 'OPS', title: 'Operations Director' },
      { email: 'ops-manager@techcorp.com', name: 'Quinn Murphy', role: Role.MANAGER, dept: 'OPS', title: 'Operations Manager' },
      { email: 'strategy-lead@techcorp.com', name: 'Jamie Rivera', role: Role.MANAGER, dept: 'OPS', title: 'Strategy Lead' },
      { email: 'pmo-lead@techcorp.com', name: 'Taylor Ortiz', role: Role.MEMBER, dept: 'OPS', title: 'PMO Lead' },
      { email: 'process-analyst@techcorp.com', name: 'Riley Patel', role: Role.MEMBER, dept: 'OPS', title: 'Process Analyst' },
      { email: 'biz-ops1@techcorp.com', name: 'Morgan Shaw', role: Role.MEMBER, dept: 'OPS', title: 'Business Operations' },
      { email: 'biz-ops2@techcorp.com', name: 'Dakota Kim', role: Role.MEMBER, dept: 'OPS', title: 'Business Operations' }
    ];

    // Create all users
    const users = await Promise.all(
      userData.map(u => db.user.create({
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
    const now = new Date();

    // Helper to create influence edges with varied timestamps
    const createInfluenceEdge = async (
      sourceEmail: string,
      targetEmail: string,
      weight: number,
      context?: string,
      daysAgo?: number
    ) => {
      const createdAt = daysAgo 
        ? new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      
      return db.influenceEdge.create({
        data: {
          sourceUserId: userMap[sourceEmail],
          targetUserId: userMap[targetEmail],
          organizationId: org.id,
          weight,
          context: context || 'Organizational influence',
          contextType: 'ORGANIC',
          createdAt
        }
      });
    };

    // Create comprehensive influence relationships
    const edgePromises = [
      // CEO influences
      createInfluenceEdge('ceo@techcorp.com', 'cto@techcorp.com', 98, 'Executive alignment', 180),
      createInfluenceEdge('ceo@techcorp.com', 'cfo@techcorp.com', 95, 'Executive alignment', 180),
      createInfluenceEdge('ceo@techcorp.com', 'coo@techcorp.com', 95, 'Executive alignment', 180),
      createInfluenceEdge('ceo@techcorp.com', 'eng-vp@techcorp.com', 75, 'Strategic direction', 150),
      createInfluenceEdge('ceo@techcorp.com', 'product-vp@techcorp.com', 80, 'Product vision', 150),
      createInfluenceEdge('ceo@techcorp.com', 'sales-vp@techcorp.com', 70, 'Revenue targets', 140),
      createInfluenceEdge('ceo@techcorp.com', 'marketing-vp@techcorp.com', 65, 'Brand strategy', 140),
      createInfluenceEdge('ceo@techcorp.com', 'data-vp@techcorp.com', 60, 'Data strategy', 120),

      // CTO influences
      createInfluenceEdge('cto@techcorp.com', 'eng-vp@techcorp.com', 95, 'Technical leadership', 170),
      createInfluenceEdge('cto@techcorp.com', 'data-vp@techcorp.com', 85, 'Technology alignment', 160),
      createInfluenceEdge('cto@techcorp.com', 'cio@techcorp.com', 90, 'IT strategy', 150),
      createInfluenceEdge('cto@techcorp.com', 'eng-director1@techcorp.com', 75, 'Platform direction', 140),
      createInfluenceEdge('cto@techcorp.com', 'eng-director2@techcorp.com', 75, 'Infrastructure direction', 140),
      createInfluenceEdge('cto@techcorp.com', 'devops-lead@techcorp.com', 70, 'DevOps strategy', 130),

      // CFO influences
      createInfluenceEdge('cfo@techcorp.com', 'finance-director@techcorp.com', 92, 'Financial oversight', 160),
      createInfluenceEdge('cfo@techcorp.com', 'controller@techcorp.com', 88, 'Financial controls', 150),

      // COO influences
      createInfluenceEdge('coo@techcorp.com', 'ops-director@techcorp.com', 90, 'Operations oversight', 155),
      createInfluenceEdge('coo@techcorp.com', 'hr-vp@techcorp.com', 75, 'People operations', 145),

      // Engineering VP influences
      createInfluenceEdge('eng-vp@techcorp.com', 'eng-director1@techcorp.com', 92, 'Direct report', 140),
      createInfluenceEdge('eng-vp@techcorp.com', 'eng-director2@techcorp.com', 92, 'Direct report', 140),
      createInfluenceEdge('eng-vp@techcorp.com', 'eng-manager1@techcorp.com', 78, 'Team leadership', 130),
      createInfluenceEdge('eng-vp@techcorp.com', 'eng-manager2@techcorp.com', 78, 'Team leadership', 130),
      createInfluenceEdge('eng-vp@techcorp.com', 'eng-manager3@techcorp.com', 78, 'Team leadership', 130),
      createInfluenceEdge('eng-vp@techcorp.com', 'devops-lead@techcorp.com', 82, 'DevOps oversight', 125),

      // Engineering Directors influence
      createInfluenceEdge('eng-director1@techcorp.com', 'eng-manager1@techcorp.com', 88, 'Platform team', 120),
      createInfluenceEdge('eng-director1@techcorp.com', 'eng-manager2@techcorp.com', 85, 'API team', 120),
      createInfluenceEdge('eng-director1@techcorp.com', 'tech-lead1@techcorp.com', 75, 'Technical guidance', 110),
      createInfluenceEdge('eng-director1@techcorp.com', 'tech-lead2@techcorp.com', 75, 'Technical guidance', 110),
      
      createInfluenceEdge('eng-director2@techcorp.com', 'eng-manager3@techcorp.com', 85, 'Mobile team', 115),
      createInfluenceEdge('eng-director2@techcorp.com', 'devops-lead@techcorp.com', 80, 'Infrastructure', 115),
      createInfluenceEdge('eng-director2@techcorp.com', 'tech-lead3@techcorp.com', 72, 'Cloud guidance', 105),

      // Engineering Managers influence
      createInfluenceEdge('eng-manager1@techcorp.com', 'tech-lead1@techcorp.com', 82, 'Frontend leadership', 100),
      createInfluenceEdge('eng-manager1@techcorp.com', 'sr-dev1@techcorp.com', 75, 'Team mentorship', 90),
      createInfluenceEdge('eng-manager1@techcorp.com', 'sr-dev2@techcorp.com', 75, 'Team mentorship', 90),
      createInfluenceEdge('eng-manager1@techcorp.com', 'dev1@techcorp.com', 65, 'Code reviews', 80),
      createInfluenceEdge('eng-manager1@techcorp.com', 'dev2@techcorp.com', 65, 'Code reviews', 80),

      createInfluenceEdge('eng-manager2@techcorp.com', 'tech-lead2@techcorp.com', 82, 'Backend leadership', 95),
      createInfluenceEdge('eng-manager2@techcorp.com', 'sr-dev3@techcorp.com', 75, 'Team mentorship', 85),
      createInfluenceEdge('eng-manager2@techcorp.com', 'sr-dev4@techcorp.com', 75, 'Team mentorship', 85),
      createInfluenceEdge('eng-manager2@techcorp.com', 'dev3@techcorp.com', 65, 'Code reviews', 75),
      createInfluenceEdge('eng-manager2@techcorp.com', 'dev4@techcorp.com', 65, 'Code reviews', 75),

      createInfluenceEdge('eng-manager3@techcorp.com', 'dev5@techcorp.com', 70, 'Mobile development', 70),
      createInfluenceEdge('eng-manager3@techcorp.com', 'dev6@techcorp.com', 70, 'Mobile development', 70),

      // Tech Leads influence
      createInfluenceEdge('tech-lead1@techcorp.com', 'sr-dev1@techcorp.com', 72, 'Technical guidance', 85),
      createInfluenceEdge('tech-lead1@techcorp.com', 'dev1@techcorp.com', 65, 'Code reviews', 75),
      createInfluenceEdge('tech-lead1@techcorp.com', 'dev2@techcorp.com', 65, 'Code reviews', 75),

      createInfluenceEdge('tech-lead2@techcorp.com', 'sr-dev3@techcorp.com', 72, 'Technical guidance', 80),
      createInfluenceEdge('tech-lead2@techcorp.com', 'dev3@techcorp.com', 65, 'Code reviews', 70),
      createInfluenceEdge('tech-lead2@techcorp.com', 'dev4@techcorp.com', 65, 'Code reviews', 70),

      createInfluenceEdge('tech-lead3@techcorp.com', 'devops-lead@techcorp.com', 55, 'Cloud collaboration', 65),

      // Senior Developers influence
      createInfluenceEdge('sr-dev1@techcorp.com', 'dev1@techcorp.com', 60, 'Mentorship', 60),
      createInfluenceEdge('sr-dev1@techcorp.com', 'dev2@techcorp.com', 55, 'Pair programming', 55),
      createInfluenceEdge('sr-dev2@techcorp.com', 'dev1@techcorp.com', 50, 'Code review', 50),
      createInfluenceEdge('sr-dev3@techcorp.com', 'dev3@techcorp.com', 60, 'Mentorship', 45),
      createInfluenceEdge('sr-dev3@techcorp.com', 'dev4@techcorp.com', 55, 'Pair programming', 40),
      createInfluenceEdge('sr-dev4@techcorp.com', 'dev5@techcorp.com', 50, 'Technical guidance', 35),

      // DevOps influence
      createInfluenceEdge('devops-lead@techcorp.com', 'sr-dev2@techcorp.com', 55, 'CI/CD guidance', 60),
      createInfluenceEdge('devops-lead@techcorp.com', 'dev5@techcorp.com', 50, 'Infrastructure', 55),
      createInfluenceEdge('devops-lead@techcorp.com', 'dev6@techcorp.com', 50, 'Infrastructure', 55),

      // Product VP influences
      createInfluenceEdge('product-vp@techcorp.com', 'product-director@techcorp.com', 90, 'Product strategy', 130),
      createInfluenceEdge('product-vp@techcorp.com', 'senior-pm1@techcorp.com', 78, 'Product direction', 120),
      createInfluenceEdge('product-vp@techcorp.com', 'senior-pm2@techcorp.com', 78, 'Product direction', 120),
      createInfluenceEdge('product-vp@techcorp.com', 'eng-vp@techcorp.com', 55, 'Cross-functional', 110),

      // Product Director influences
      createInfluenceEdge('product-director@techcorp.com', 'senior-pm1@techcorp.com', 85, 'Product management', 115),
      createInfluenceEdge('product-director@techcorp.com', 'senior-pm2@techcorp.com', 85, 'Product management', 115),
      createInfluenceEdge('product-director@techcorp.com', 'pm1@techcorp.com', 72, 'Product coaching', 100),
      createInfluenceEdge('product-director@techcorp.com', 'pm2@techcorp.com', 72, 'Product coaching', 100),

      // Senior PMs influence
      createInfluenceEdge('senior-pm1@techcorp.com', 'pm1@techcorp.com', 75, 'PM mentorship', 90),
      createInfluenceEdge('senior-pm1@techcorp.com', 'po1@techcorp.com', 70, 'Agile coaching', 85),
      createInfluenceEdge('senior-pm1@techcorp.com', 'tech-lead1@techcorp.com', 45, 'Feature requirements', 80),
      createInfluenceEdge('senior-pm1@techcorp.com', 'eng-manager1@techcorp.com', 50, 'Sprint planning', 75),

      createInfluenceEdge('senior-pm2@techcorp.com', 'pm2@techcorp.com', 75, 'PM mentorship', 85),
      createInfluenceEdge('senior-pm2@techcorp.com', 'pm3@techcorp.com', 75, 'PM mentorship', 85),
      createInfluenceEdge('senior-pm2@techcorp.com', 'po2@techcorp.com', 70, 'Agile coaching', 80),
      createInfluenceEdge('senior-pm2@techcorp.com', 'tech-lead2@techcorp.com', 45, 'Feature requirements', 75),

      // PMs influence
      createInfluenceEdge('pm1@techcorp.com', 'dev1@techcorp.com', 35, 'User stories', 60),
      createInfluenceEdge('pm1@techcorp.com', 'dev2@techcorp.com', 35, 'User stories', 55),
      createInfluenceEdge('pm2@techcorp.com', 'dev3@techcorp.com', 35, 'User stories', 50),
      createInfluenceEdge('pm3@techcorp.com', 'dev5@techcorp.com', 30, 'Mobile roadmap', 45),
      createInfluenceEdge('ux-pm@techcorp.com', 'design-vp@techcorp.com', 40, 'UX collaboration', 55),

      // Data VP influences
      createInfluenceEdge('data-vp@techcorp.com', 'data-director@techcorp.com', 92, 'Data strategy', 125),
      createInfluenceEdge('data-vp@techcorp.com', 'ml-lead@techcorp.com', 80, 'ML direction', 115),
      createInfluenceEdge('data-vp@techcorp.com', 'analytics-lead@techcorp.com', 80, 'Analytics direction', 115),
      createInfluenceEdge('data-vp@techcorp.com', 'eng-vp@techcorp.com', 50, 'Data infrastructure', 100),

      // Data Director influences
      createInfluenceEdge('data-director@techcorp.com', 'sr-data-scientist1@techcorp.com', 78, 'Data science leadership', 110),
      createInfluenceEdge('data-director@techcorp.com', 'sr-data-scientist2@techcorp.com', 78, 'Data science leadership', 105),
      createInfluenceEdge('data-director@techcorp.com', 'data-analyst@techcorp.com', 65, 'Analytics guidance', 95),

      // ML Lead influences
      createInfluenceEdge('ml-lead@techcorp.com', 'ml-engineer1@techcorp.com', 75, 'ML engineering', 100),
      createInfluenceEdge('ml-lead@techcorp.com', 'ml-engineer2@techcorp.com', 75, 'ML engineering', 95),
      createInfluenceEdge('ml-lead@techcorp.com', 'sr-data-scientist1@techcorp.com', 60, 'Model deployment', 90),

      // Analytics Lead influences
      createInfluenceEdge('analytics-lead@techcorp.com', 'data-analyst@techcorp.com', 72, 'Analytics mentorship', 85),
      createInfluenceEdge('analytics-lead@techcorp.com', 'data-scientist1@techcorp.com', 65, 'Data analysis', 80),

      // Senior Data Scientists influence
      createInfluenceEdge('sr-data-scientist1@techcorp.com', 'data-scientist1@techcorp.com', 68, 'Data science mentorship', 75),
      createInfluenceEdge('sr-data-scientist1@techcorp.com', 'data-scientist2@techcorp.com', 68, 'Data science mentorship', 70),
      createInfluenceEdge('sr-data-scientist2@techcorp.com', 'data-scientist3@techcorp.com', 68, 'Data science mentorship', 65),
      createInfluenceEdge('sr-data-scientist2@techcorp.com', 'ml-engineer1@techcorp.com', 55, 'ML collaboration', 60),

      // Design VP influences
      createInfluenceEdge('design-vp@techcorp.com', 'design-director@techcorp.com', 90, 'Design vision', 120),
      createInfluenceEdge('design-vp@techcorp.com', 'ux-lead@techcorp.com', 82, 'UX strategy', 110),
      createInfluenceEdge('design-vp@techcorp.com', 'ui-lead@techcorp.com', 82, 'UI direction', 110),
      createInfluenceEdge('design-vp@techcorp.com', 'product-vp@techcorp.com', 45, 'Design-product alignment', 100),

      // Design Director influences
      createInfluenceEdge('design-director@techcorp.com', 'sr-designer1@techcorp.com', 78, 'Design leadership', 95),
      createInfluenceEdge('design-director@techcorp.com', 'sr-designer2@techcorp.com', 78, 'Design leadership', 90),
      createInfluenceEdge('design-director@techcorp.com', 'designer1@techcorp.com', 65, 'Design coaching', 85),

      // UX/UI Leads influence
      createInfluenceEdge('ux-lead@techcorp.com', 'sr-designer1@techcorp.com', 72, 'UX guidance', 80),
      createInfluenceEdge('ux-lead@techcorp.com', 'designer1@techcorp.com', 65, 'UX mentorship', 75),
      createInfluenceEdge('ux-lead@techcorp.com', 'ux-pm@techcorp.com', 60, 'UX-product alignment', 70),

      createInfluenceEdge('ui-lead@techcorp.com', 'sr-designer2@techcorp.com', 72, 'UI guidance', 75),
      createInfluenceEdge('ui-lead@techcorp.com', 'designer2@techcorp.com', 65, 'UI mentorship', 70),

      // Senior Designers influence
      createInfluenceEdge('sr-designer1@techcorp.com', 'designer1@techcorp.com', 60, 'Design mentorship', 65),
      createInfluenceEdge('sr-designer1@techcorp.com', 'dev1@techcorp.com', 30, 'Design-dev collaboration', 60),
      createInfluenceEdge('sr-designer2@techcorp.com', 'designer2@techcorp.com', 60, 'Design mentorship', 55),
      createInfluenceEdge('sr-designer2@techcorp.com', 'dev5@techcorp.com', 30, 'Mobile design', 50),

      // Sales VP influences
      createInfluenceEdge('sales-vp@techcorp.com', 'sales-director-na@techcorp.com', 92, 'NA sales strategy', 130),
      createInfluenceEdge('sales-vp@techcorp.com', 'sales-director-eu@techcorp.com', 90, 'EU sales strategy', 125),
      createInfluenceEdge('sales-vp@techcorp.com', 'sales-director-apac@techcorp.com', 88, 'APAC sales strategy', 120),
      createInfluenceEdge('sales-vp@techcorp.com', 'marketing-vp@techcorp.com', 55, 'Sales-marketing alignment', 110),

      // Sales Directors influence
      createInfluenceEdge('sales-director-na@techcorp.com', 'enterprise-ae1@techcorp.com', 82, 'Enterprise sales', 110),
      createInfluenceEdge('sales-director-na@techcorp.com', 'enterprise-ae2@techcorp.com', 80, 'Enterprise sales', 105),
      createInfluenceEdge('sales-director-na@techcorp.com', 'midmarket-ae1@techcorp.com', 75, 'Mid-market sales', 100),

      createInfluenceEdge('sales-director-eu@techcorp.com', 'enterprise-ae3@techcorp.com', 82, 'EU enterprise', 100),
      createInfluenceEdge('sales-director-eu@techcorp.com', 'midmarket-ae2@techcorp.com', 75, 'EU mid-market', 95),

      createInfluenceEdge('sales-director-apac@techcorp.com', 'midmarket-ae3@techcorp.com', 75, 'APAC sales', 90),

      // Enterprise AEs influence
      createInfluenceEdge('enterprise-ae1@techcorp.com', 'sdr-lead@techcorp.com', 55, 'Lead generation', 80),
      createInfluenceEdge('enterprise-ae1@techcorp.com', 'sdr1@techcorp.com', 45, 'Prospecting', 75),
      createInfluenceEdge('enterprise-ae2@techcorp.com', 'sdr2@techcorp.com', 45, 'Prospecting', 70),
      createInfluenceEdge('enterprise-ae3@techcorp.com', 'sdr3@techcorp.com', 45, 'Prospecting', 65),

      // SDR Lead influence
      createInfluenceEdge('sdr-lead@techcorp.com', 'sdr1@techcorp.com', 72, 'SDR coaching', 70),
      createInfluenceEdge('sdr-lead@techcorp.com', 'sdr2@techcorp.com', 72, 'SDR coaching', 65),
      createInfluenceEdge('sdr-lead@techcorp.com', 'sdr3@techcorp.com', 72, 'SDR coaching', 60),

      // Sales Ops influence
      createInfluenceEdge('sales-ops@techcorp.com', 'sales-director-na@techcorp.com', 40, 'Sales analytics', 55),
      createInfluenceEdge('sales-ops@techcorp.com', 'enterprise-ae1@techcorp.com', 35, 'Sales tools', 50),

      // Marketing VP influences
      createInfluenceEdge('marketing-vp@techcorp.com', 'marketing-director@techcorp.com', 88, 'Marketing strategy', 115),
      createInfluenceEdge('marketing-vp@techcorp.com', 'demand-gen@techcorp.com', 78, 'Demand generation', 105),
      createInfluenceEdge('marketing-vp@techcorp.com', 'content-lead@techcorp.com', 75, 'Content strategy', 100),

      // Marketing Director influences
      createInfluenceEdge('marketing-director@techcorp.com', 'brand-manager@techcorp.com', 72, 'Brand management', 90),
      createInfluenceEdge('marketing-director@techcorp.com', 'digital-marketing@techcorp.com', 72, 'Digital strategy', 85),

      // Demand Gen influence
      createInfluenceEdge('demand-gen@techcorp.com', 'digital-marketing@techcorp.com', 65, 'Campaign strategy', 80),
      createInfluenceEdge('demand-gen@techcorp.com', 'sdr-lead@techcorp.com', 50, 'Lead handoff', 75),

      // Content Lead influence
      createInfluenceEdge('content-lead@techcorp.com', 'content-writer1@techcorp.com', 68, 'Content guidance', 70),
      createInfluenceEdge('content-lead@techcorp.com', 'content-writer2@techcorp.com', 68, 'Content guidance', 65),
      createInfluenceEdge('content-lead@techcorp.com', 'social-media@techcorp.com', 55, 'Content distribution', 60),

      // Other marketing influences
      createInfluenceEdge('brand-manager@techcorp.com', 'content-writer1@techcorp.com', 45, 'Brand voice', 55),
      createInfluenceEdge('digital-marketing@techcorp.com', 'social-media@techcorp.com', 55, 'Digital campaigns', 50),
      createInfluenceEdge('events-manager@techcorp.com', 'content-writer2@techcorp.com', 35, 'Event content', 45),

      // HR VP influences
      createInfluenceEdge('hr-vp@techcorp.com', 'hr-director@techcorp.com', 90, 'HR strategy', 110),
      createInfluenceEdge('hr-vp@techcorp.com', 'talent-acquisition@techcorp.com', 82, 'Talent strategy', 100),
      createInfluenceEdge('hr-vp@techcorp.com', 'coo@techcorp.com', 45, 'People operations', 95),

      // HR Director influences
      createInfluenceEdge('hr-director@techcorp.com', 'hr-bp1@techcorp.com', 75, 'HR business partnering', 85),
      createInfluenceEdge('hr-director@techcorp.com', 'hr-bp2@techcorp.com', 75, 'HR business partnering', 80),

      // Talent Acquisition influence
      createInfluenceEdge('talent-acquisition@techcorp.com', 'recruiter1@techcorp.com', 72, 'Recruiting strategy', 75),
      createInfluenceEdge('talent-acquisition@techcorp.com', 'recruiter2@techcorp.com', 72, 'Recruiting strategy', 70),
      createInfluenceEdge('talent-acquisition@techcorp.com', 'eng-vp@techcorp.com', 35, 'Engineering hiring', 65),

      // HR BP influences
      createInfluenceEdge('hr-bp1@techcorp.com', 'eng-director1@techcorp.com', 30, 'HR partnership', 60),
      createInfluenceEdge('hr-bp2@techcorp.com', 'product-director@techcorp.com', 30, 'HR partnership', 55),

      // Finance Director influences
      createInfluenceEdge('finance-director@techcorp.com', 'controller@techcorp.com', 85, 'Financial oversight', 95),
      createInfluenceEdge('finance-director@techcorp.com', 'fp-a-lead@techcorp.com', 80, 'FP&A direction', 90),
      createInfluenceEdge('finance-director@techcorp.com', 'accounting-manager@techcorp.com', 72, 'Accounting oversight', 85),

      // Controller influence
      createInfluenceEdge('controller@techcorp.com', 'staff-accountant@techcorp.com', 68, 'Accounting guidance', 70),
      createInfluenceEdge('controller@techcorp.com', 'ar-specialist@techcorp.com', 62, 'AR management', 65),
      createInfluenceEdge('controller@techcorp.com', 'ap-specialist@techcorp.com', 62, 'AP management', 60),

      // FP&A Lead influence
      createInfluenceEdge('fp-a-lead@techcorp.com', 'senior-analyst@techcorp.com', 70, 'Financial analysis', 65),

      // Operations Director influences
      createInfluenceEdge('ops-director@techcorp.com', 'ops-manager@techcorp.com', 85, 'Operations management', 90),
      createInfluenceEdge('ops-director@techcorp.com', 'strategy-lead@techcorp.com', 78, 'Strategy direction', 85),
      createInfluenceEdge('ops-director@techcorp.com', 'pmo-lead@techcorp.com', 72, 'PMO oversight', 80),

      // Strategy Lead influence
      createInfluenceEdge('strategy-lead@techcorp.com', 'biz-ops1@techcorp.com', 68, 'Strategic initiatives', 70),
      createInfluenceEdge('strategy-lead@techcorp.com', 'biz-ops2@techcorp.com', 68, 'Strategic initiatives', 65),

      // PMO Lead influence
      createInfluenceEdge('pmo-lead@techcorp.com', 'process-analyst@techcorp.com', 65, 'Process improvement', 60),

      // Cross-department collaborations
      createInfluenceEdge('pm1@techcorp.com', 'data-scientist1@techcorp.com', 35, 'Product analytics', 50),
      createInfluenceEdge('sr-dev1@techcorp.com', 'data-scientist2@techcorp.com', 30, 'Data pipeline', 45),
      createInfluenceEdge('enterprise-ae1@techcorp.com', 'senior-pm1@techcorp.com', 40, 'Customer feedback', 55),
      createInfluenceEdge('marketing-director@techcorp.com', 'sales-director-na@techcorp.com', 45, 'Marketing-sales alignment', 60),
      createInfluenceEdge('content-lead@techcorp.com', 'sr-designer1@techcorp.com', 35, 'Content design', 50),
      createInfluenceEdge('analytics-lead@techcorp.com', 'senior-pm2@techcorp.com', 35, 'Product analytics', 55),

      // Peer influences
      createInfluenceEdge('dev1@techcorp.com', 'dev2@techcorp.com', 35, 'Pair programming', 30),
      createInfluenceEdge('dev3@techcorp.com', 'dev4@techcorp.com', 35, 'Pair programming', 25),
      createInfluenceEdge('pm1@techcorp.com', 'pm2@techcorp.com', 40, 'PM collaboration', 35),
      createInfluenceEdge('sdr1@techcorp.com', 'sdr2@techcorp.com', 35, 'SDR collaboration', 30),
      createInfluenceEdge('designer1@techcorp.com', 'designer2@techcorp.com', 35, 'Design collaboration', 25)
    ];

    await Promise.all(edgePromises);

    // Create projects
    const projects = await Promise.all([
      db.project.create({
        data: {
          name: 'AI Platform Redesign',
          description: 'Complete redesign of the AI platform with new ML capabilities',
          organizationId: org.id,
          departmentId: deptMap['ENG'],
          authorId: userMap['eng-vp@techcorp.com'],
          status: 'ACTIVE',
          startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          budget: 2000000
        }
      }),
      db.project.create({
        data: {
          name: 'Customer Analytics Dashboard',
          description: 'Real-time analytics dashboard for customer insights',
          organizationId: org.id,
          departmentId: deptMap['DATA'],
          authorId: userMap['data-vp@techcorp.com'],
          status: 'ACTIVE',
          startDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
          budget: 750000
        }
      }),
      db.project.create({
        data: {
          name: 'Mobile App v3.0',
          description: 'Next generation mobile application',
          organizationId: org.id,
          departmentId: deptMap['ENG'],
          authorId: userMap['eng-director2@techcorp.com'],
          status: 'ACTIVE',
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          budget: 1200000
        }
      }),
      db.project.create({
        data: {
          name: 'Enterprise Sales Enablement',
          description: 'Tools and processes for enterprise sales team',
          organizationId: org.id,
          departmentId: deptMap['SALES'],
          authorId: userMap['sales-vp@techcorp.com'],
          status: 'COMPLETED',
          startDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          successScore: 0.92,
          budget: 500000
        }
      }),
      db.project.create({
        data: {
          name: 'Brand Refresh Initiative',
          description: 'Complete brand redesign and marketing materials',
          organizationId: org.id,
          departmentId: deptMap['MKTG'],
          authorId: userMap['marketing-vp@techcorp.com'],
          status: 'COMPLETED',
          startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          successScore: 0.88,
          budget: 350000
        }
      })
    ]);

    // Add project members
    await db.projectMember.createMany({
      data: [
        // AI Platform Redesign
        { projectId: projects[0].id, userId: userMap['tech-lead1@techcorp.com'], role: 'LEAD', contributionScore: 0.95 },
        { projectId: projects[0].id, userId: userMap['sr-dev1@techcorp.com'], role: 'MEMBER', contributionScore: 0.85 },
        { projectId: projects[0].id, userId: userMap['sr-dev2@techcorp.com'], role: 'MEMBER', contributionScore: 0.80 },
        { projectId: projects[0].id, userId: userMap['dev1@techcorp.com'], role: 'MEMBER', contributionScore: 0.70 },
        { projectId: projects[0].id, userId: userMap['ml-engineer1@techcorp.com'], role: 'MEMBER', contributionScore: 0.75 },
        { projectId: projects[0].id, userId: userMap['pm1@techcorp.com'], role: 'MEMBER', contributionScore: 0.65 },

        // Customer Analytics Dashboard
        { projectId: projects[1].id, userId: userMap['analytics-lead@techcorp.com'], role: 'LEAD', contributionScore: 0.90 },
        { projectId: projects[1].id, userId: userMap['sr-data-scientist1@techcorp.com'], role: 'MEMBER', contributionScore: 0.85 },
        { projectId: projects[1].id, userId: userMap['data-scientist1@techcorp.com'], role: 'MEMBER', contributionScore: 0.75 },
        { projectId: projects[1].id, userId: userMap['data-analyst@techcorp.com'], role: 'MEMBER', contributionScore: 0.70 },

        // Mobile App v3.0
        { projectId: projects[2].id, userId: userMap['tech-lead3@techcorp.com'], role: 'LEAD', contributionScore: 0.92 },
        { projectId: projects[2].id, userId: userMap['dev5@techcorp.com'], role: 'MEMBER', contributionScore: 0.80 },
        { projectId: projects[2].id, userId: userMap['dev6@techcorp.com'], role: 'MEMBER', contributionScore: 0.75 },
        { projectId: projects[2].id, userId: userMap['sr-designer2@techcorp.com'], role: 'MEMBER', contributionScore: 0.70 },
        { projectId: projects[2].id, userId: userMap['pm3@techcorp.com'], role: 'MEMBER', contributionScore: 0.65 }
      ]
    });

    // Create proposals
    await Promise.all([
      db.proposal.create({
        data: {
          title: 'Implement Real-time Collaboration Features',
          description: 'Add real-time collaborative editing and presence indicators across the platform',
          organizationId: org.id,
          projectId: projects[0].id,
          authorId: userMap['senior-pm1@techcorp.com'],
          status: 'UNDER_REVIEW',
          impact: 0.85
        }
      }),
      db.proposal.create({
        data: {
          title: 'ML Model Auto-scaling Infrastructure',
          description: 'Implement automatic scaling for ML inference workloads based on demand',
          organizationId: org.id,
          projectId: projects[0].id,
          authorId: userMap['ml-lead@techcorp.com'],
          status: 'ADOPTED',
          impact: 0.92,
          adoptedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
        }
      }),
      db.proposal.create({
        data: {
          title: 'Customer 360 Data Integration',
          description: 'Integrate all customer data sources into a unified view for better analytics',
          organizationId: org.id,
          projectId: projects[1].id,
          authorId: userMap['data-director@techcorp.com'],
          status: 'UNDER_REVIEW',
          impact: 0.78
        }
      }),
      db.proposal.create({
        data: {
          title: 'Mobile Performance Optimization',
          description: 'Reduce app startup time and improve offline capabilities',
          organizationId: org.id,
          projectId: projects[2].id,
          authorId: userMap['tech-lead3@techcorp.com'],
          status: 'ADOPTED',
          impact: 0.88,
          adoptedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    // Initialize influence scores with varied values
    for (const user of users) {
      const baseScore = Math.random() * 100;
      await db.influenceScore.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          score: baseScore,
          rawScore: baseScore * 0.8,
          volatility: Math.random() * 20,
          scoreType: 'TOTAL'
        }
      });
    }

    // Create some influence events
    const eventPromises = [];
    for (let i = 0; i < 50; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const eventTypes = ['PROJECT_SUCCESS', 'PROPOSAL_ADOPTED', 'MENTORSHIP', 'COLLABORATION'] as const;
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      eventPromises.push(
        db.influenceEvent.create({
          data: {
            organizationId: org.id,
            subjectUserId: randomUser.id,
            eventType: randomType,
            weightDelta: Math.random() * 20 - 5,
            createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          }
        })
      );
    }
    await Promise.all(eventPromises);

    return NextResponse.json({
      message: 'Database seeded successfully with comprehensive demo data',
      seeded: true,
      data: {
        organizationId: org.id,
        organization: org.name,
        departments: departments.length,
        users: users.length,
        edges: edgePromises.length,
        projects: projects.length,
        events: 50
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint - Returns org ID, seeds if needed
export async function GET() {
  try {
    // Check if data exists
    const org = await db.organization.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    if (org) {
      return NextResponse.json({
        organizationId: org.id,
        organization: org.name,
        seeded: false,
        message: 'Organization found'
      });
    }
    
    // No data - trigger seed
    const seedResponse = await fetch('http://localhost:3000/api/seed', { method: 'POST' });
    const seedData = await seedResponse.json();
    
    return NextResponse.json({
      organizationId: seedData.data?.organizationId,
      organization: seedData.data?.organization,
      seeded: true,
      message: seedData.message
    });
  } catch (error) {
    console.error('GET seed error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}
