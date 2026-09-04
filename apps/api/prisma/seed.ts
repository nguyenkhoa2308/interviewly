import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
    const skills = [
        { name: 'JavaScript', slug: 'javascript', category: 'TECHNICAL' },
        { name: 'TypeScript', slug: 'typescript', category: 'TECHNICAL' },
        { name: 'React', slug: 'react', category: 'FRONTEND' },
        { name: 'Next.js', slug: 'nextjs', category: 'FRONTEND' },
        { name: 'Node.js', slug: 'nodejs', category: 'BACKEND' },
        { name: 'NestJS', slug: 'nestjs', category: 'BACKEND' },
        { name: 'PostgreSQL', slug: 'postgresql', category: 'DATABASE' },
        {
            name: 'Communication',
            slug: 'communication',
            category: 'SOFT_SKILL',
        },
        {
            name: 'Problem Solving',
            slug: 'problem-solving',
            category: 'SOFT_SKILL',
        },
    ];

    await Promise.all(
        skills.map((skill) =>
            prisma.skill.upsert({
                where: { slug: skill.slug },
                update: {
                    name: skill.name,
                    category: skill.category,
                    isActive: true,
                },
                create: skill,
            }),
        ),
    );

    console.log(`Seeded ${skills.length} skills.`);
}

main()
    .catch((error: unknown) => {
        console.error('Database seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
