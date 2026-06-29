import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfigDir } from './paths';

/**
 * A custom skill bundled in this repository.
 * Unlike npx-installed skills, these are copied from bundled source directories
 * to the OpenCode skills directory.
 */
export interface CustomSkill {
  /** Skill name (folder name) */
  name: string;
  /** Human-readable description */
  description: string;
  /** List of agents that should auto-allow this skill */
  allowedAgents: string[];
  /** Source path in this repo (relative to project root) */
  sourcePath: string;
}

/**
 * Registry of custom skills bundled in this repository.
 */
export const CUSTOM_SKILLS: CustomSkill[] = [
  {
    name: 'simplify',
    description: 'Code simplification and readability-focused refactoring',
    allowedAgents: ['oracle'],
    sourcePath: 'src/skills/simplify',
  },
  {
    name: 'codemap',
    description: 'Repository understanding and hierarchical codemap generation',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/codemap',
  },
  {
    name: 'clonedeps',
    description: 'Clone important dependency source for local inspection',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/clonedeps',
  },
  {
    name: 'grill',
    description:
      'Docs-aware SDD self-interrogation workflow that converts raw requests into requirements/design, shared terminology, and ADR-worthy decisions',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/fork/skills/grill',
  },
  {
    name: 'brainstorming',
    description:
      'Fuzzy front-end ideation for non-SDD repositories before formal specification',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/fork/skills/brainstorming',
  },
  {
    name: 'opencode-state-repair',
    description:
      'Repair local OpenCode state corruption such as stale running subagent tasks, stuck blue dots, wrong project icons, and broken session records',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/fork/skills/opencode-state-repair',
  },
  {
    name: 'using-git-worktrees',
    description: 'Use git worktrees for isolated feature work',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/fork/skills/using-git-worktrees',
  },
  {
    name: 'finishing-a-development-branch',
    description: 'End-of-branch merge, PR, keep, or discard decision workflow',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/fork/skills/finishing-a-development-branch',
  },
  {
    name: 'deepwork',
    description:
      'Heavy/complex coding sessions and large modifications workflow',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/deepwork',
  },
  {
    name: 'reflect',
    description:
      'Review repeated work and suggest reusable workflow improvements',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/reflect',
  },
  {
    name: 'oh-my-opencode-slim',
    description:
      'Configure, customize, and safely improve oh-my-opencode-slim setups',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/oh-my-opencode-slim',
  },
  {
    name: 'release-smoke-test',
    description:
      'Validate packed release candidates and bugfixes before public publish',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/release-smoke-test',
  },
  {
    name: 'worktrees',
    description:
      'Manage Git worktrees as OMO safe isolated coding lanes for complex/risky/parallel work',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/worktrees',
  },
];

/**
 * Get the target directory for custom skills installation.
 */
export function getCustomSkillsDir(): string {
  return join(getConfigDir(), 'skills');
}

/**
 * Recursively copy a directory.
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install a custom skill by copying from its bundled source directory to the OpenCode skills directory.
 * @param skill - The custom skill to install
 * @param projectRoot - Root directory of oh-my-opencode-slim project
 * @returns True if installation succeeded, false otherwise
 */
export function installCustomSkill(skill: CustomSkill): boolean {
  try {
    const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
    const sourcePath = join(packageRoot, skill.sourcePath);
    const targetPath = join(getCustomSkillsDir(), skill.name);

    // Validate source exists
    if (!existsSync(sourcePath)) {
      console.error(`Custom skill source not found: ${sourcePath}`);
      return false;
    }

    // Copy skill directory
    copyDirRecursive(sourcePath, targetPath);

    return true;
  } catch (error) {
    console.error(`Failed to install custom skill: ${skill.name}`, error);
    return false;
  }
}
