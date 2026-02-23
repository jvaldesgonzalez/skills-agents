import { createMiddleware, tool } from 'langchain';
import type { Superpower } from '@/store';
import { z } from 'zod';

function formatSkillContent(skill: Superpower): string {
  return `# ${skill.name}\n\n${skill.content}}`;
}

export function createSkillMiddleware(skills: Superpower[]) {
  const loadSkill = tool(
    async ({ skillName }) => {
      console.log(`\n==================================================`);
      console.log(`[AGENT] 🌟 LOADING SKILL: "${skillName}"`);
      console.log(`==================================================\n`);
      const skill = skills.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase()
      );
      if (skill) {
        return `Loaded skill: ${skill.name}\n\n${formatSkillContent(skill)}`;
      }
      const available = skills.map((s) => s.name).join(', ');
      return `Skill '${skillName}' not found. Available skills: ${available || 'none'}`;
    },
    {
      name: 'load_skill',
      description: `Load the full content of a skill into the agent's context. You MUST call this before attempting to perform any task related to an available skill.`,
      schema: z.object({
        skillName: z.string().describe('The EXACT name of the skill to load, e.g. "Product Catalogs" or "Appointment Scheduler"'),
      }),
    }
  );

  const skillsPrompt =
    skills.length > 0
      ? skills
          .map((s) => `- **${s.name}**: ${s.description}`)
          .join('\n')
      : 'No skills available.';

  return createMiddleware({
    name: 'skillMiddleware',
    tools: [loadSkill],
    wrapModelCall: async (request, handler) => {
      const addendum =
        `\n\n## Available Skills\n\nYou have access to the following skills. You MUST use the \`load_skill\` tool to load the full content and instructions for a skill before you try to use it or answer questions related to it.\n\n${skillsPrompt}\n\n` +
        'CRITICAL: Before handling any user request that matches one of your available skills, you MUST first call the `load_skill` tool with the exact name of the relevant skill. Do not assume you know how to perform the task without loading the skill first.';
      const newSystemPrompt = (request.systemPrompt ?? '') + addendum;
      return handler({ ...request, systemPrompt: newSystemPrompt });
    },
  });
}
