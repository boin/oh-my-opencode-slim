import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import * as path from 'node:path';
import { CUSTOM_SKILLS, type CustomSkill } from '../../cli/custom-skills';
import { getConfigDir } from '../../cli/paths';
import { log } from '../../utils/logger';

export interface SkillSyncResult {
  installed: string[];
  skippedExisting: string[];
  failed: string[];
}

type SkillRegistryEntry = Pick<CustomSkill, 'name' | 'sourcePath'>;

/**
 * Recursively copies src to dest. Does not follow/copy symbolic links.
 */
function copyDirRecursive(src: string, dest: string): void {
  const stat = lstatSync(src);
  if (stat.isSymbolicLink()) {
    return;
  }
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src);
    for (const entry of entries) {
      copyDirRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isFile()) {
    const destDir = path.dirname(dest);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    copyFileSync(src, dest);
  }
}

/**
 * Synchronizes bundled skills from the newly installed package root to OpenCode config skills directory.
 */
export function syncBundledSkillsFromPackage(
  packageRoot: string,
  skills: readonly SkillRegistryEntry[] = CUSTOM_SKILLS,
): SkillSyncResult {
  const installed: string[] = [];
  const skippedExisting: string[] = [];
  const failed: string[] = [];

  const destSkillsDir = path.join(getConfigDir(), 'skills');

  try {
    if (!existsSync(destSkillsDir)) {
      mkdirSync(destSkillsDir, { recursive: true });
    }
  } catch (err) {
    log(
      `[skill-sync] Failed to create destination skills directory: ${destSkillsDir}`,
      err,
    );
  }

  for (const skill of skills) {
    const { name, sourcePath } = skill;
    const entryPath = path.join(packageRoot, sourcePath);

    if (name.startsWith('.')) {
      continue;
    }

    let entryStat: ReturnType<typeof lstatSync>;
    try {
      entryStat = lstatSync(entryPath);
    } catch (err) {
      log(`[skill-sync] Source skill is unavailable, skipping ${name}:`, err);
      continue;
    }

    if (entryStat.isSymbolicLink() || !entryStat.isDirectory()) {
      continue;
    }

    const skillMdPath = path.join(entryPath, 'SKILL.md');
    try {
      const skillMdStat = lstatSync(skillMdPath);
      if (skillMdStat.isSymbolicLink() || !skillMdStat.isFile()) {
        continue;
      }
    } catch {
      continue;
    }

    try {
      const destPath = path.join(destSkillsDir, name);

      let destExists = false;
      try {
        lstatSync(destPath);
        destExists = true;
      } catch {
        // Does not exist
      }

      if (destExists) {
        log(`[skill-sync] Skill already exists in destination: ${name}`);
        skippedExisting.push(name);
        continue;
      }

      const stagingDir = mkdtempSync(
        path.join(destSkillsDir, `.sync-staging-${name}-`),
      );

      try {
        copyDirRecursive(entryPath, stagingDir);

        let destExistsLate = false;
        try {
          lstatSync(destPath);
          destExistsLate = true;
        } catch {}

        if (destExistsLate) {
          log(
            `[skill-sync] Destination path was created during staging for ${name}, skipping promotion.`,
          );
          skippedExisting.push(name);
        } else {
          renameSync(stagingDir, destPath);
          installed.push(name);
          log(`[skill-sync] Successfully synced skill: ${name}`);
        }
      } catch (err) {
        log(`[skill-sync] Failed to sync skill ${name}:`, err);
        failed.push(name);
      } finally {
        try {
          if (existsSync(stagingDir)) {
            rmSync(stagingDir, { recursive: true, force: true });
          }
        } catch (err) {
          log(
            `[skill-sync] Failed to clean up staging directory ${stagingDir}:`,
            err,
          );
        }
      }
    } catch (err) {
      log(`[skill-sync] Error processing source entry ${name}:`, err);
      failed.push(name);
    }
  }

  return { installed, skippedExisting, failed };
}
