import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

let importCounter = 0;

type TestSkillRegistryEntry = { name: string; sourcePath: string };

async function syncBundledSkillsFromPackage(
  packageRoot: string,
  skills: TestSkillRegistryEntry[],
) {
  const module = await import(`./skill-sync?test=${importCounter++}`);
  return module.syncBundledSkillsFromPackage(packageRoot, skills);
}

describe('syncBundledSkillsFromPackage', () => {
  let tempDir: string;
  let fakePackageRoot: string;
  let fakeDestConfigDir: string;
  let origEnvConfigDir: string | undefined;

  beforeEach(() => {
    origEnvConfigDir = process.env.OPENCODE_CONFIG_DIR;
    // Create a unique temporary directory for this test run
    const randomId = Math.random().toString(36).substring(2, 10);
    tempDir = path.join(os.tmpdir(), `omo-test-${randomId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    fakePackageRoot = path.join(tempDir, 'fake-package');
    fakeDestConfigDir = path.join(tempDir, 'fake-config');

    fs.mkdirSync(path.join(fakePackageRoot, 'src', 'skills'), {
      recursive: true,
    });
    fs.mkdirSync(fakeDestConfigDir, { recursive: true });

    process.env.OPENCODE_CONFIG_DIR = fakeDestConfigDir;
  });

  afterEach(() => {
    process.env.OPENCODE_CONFIG_DIR = origEnvConfigDir;
    // Clean up temporary directories
    try {
      // Restore permissions of any potentially locked files first
      const restorePermissions = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          try {
            fs.chmodSync(entryPath, 0o777);
          } catch {
            // ignore
          }
          if (fs.statSync(entryPath).isDirectory()) {
            restorePermissions(entryPath);
          }
        }
      };
      restorePermissions(tempDir);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  test('installs registered skills from bundled and fork skill roots', async () => {
    const skillName = 'test-skill';
    const forkSkillName = 'fork-test-skill';
    const skillSourcePath = path.join('src', 'skills', skillName);
    const forkSkillSourcePath = path.join(
      'src',
      'fork',
      'skills',
      forkSkillName,
    );
    const skillSrcDir = path.join(fakePackageRoot, skillSourcePath);
    const forkSkillSrcDir = path.join(fakePackageRoot, forkSkillSourcePath);
    fs.mkdirSync(skillSrcDir, { recursive: true });
    fs.mkdirSync(forkSkillSrcDir, { recursive: true });
    fs.writeFileSync(path.join(skillSrcDir, 'SKILL.md'), '# Test Skill');
    fs.writeFileSync(path.join(skillSrcDir, 'some-file.txt'), 'hello world');
    fs.writeFileSync(path.join(forkSkillSrcDir, 'SKILL.md'), '# Fork Skill');
    fs.writeFileSync(path.join(forkSkillSrcDir, 'fork-file.txt'), 'from fork');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: skillName, sourcePath: skillSourcePath },
      { name: forkSkillName, sourcePath: forkSkillSourcePath },
    ]);

    expect(result.installed).toContain(skillName);
    expect(result.installed).toContain(forkSkillName);
    expect(result.skippedExisting).toHaveLength(0);
    expect(result.failed).toHaveLength(0);

    const destSkillDir = path.join(fakeDestConfigDir, 'skills', skillName);
    expect(fs.existsSync(destSkillDir)).toBe(true);
    expect(fs.readFileSync(path.join(destSkillDir, 'SKILL.md'), 'utf-8')).toBe(
      '# Test Skill',
    );
    expect(
      fs.readFileSync(path.join(destSkillDir, 'some-file.txt'), 'utf-8'),
    ).toBe('hello world');

    const destForkSkillDir = path.join(
      fakeDestConfigDir,
      'skills',
      forkSkillName,
    );
    expect(fs.existsSync(destForkSkillDir)).toBe(true);
    expect(
      fs.readFileSync(path.join(destForkSkillDir, 'SKILL.md'), 'utf-8'),
    ).toBe('# Fork Skill');
    expect(
      fs.readFileSync(path.join(destForkSkillDir, 'fork-file.txt'), 'utf-8'),
    ).toBe('from fork');
  });

  test('skips existing destination skill folders without overwriting', async () => {
    const skillName = 'existing-skill';
    const skillSrcDir = path.join(fakePackageRoot, 'src', 'skills', skillName);
    fs.mkdirSync(skillSrcDir, { recursive: true });
    fs.writeFileSync(path.join(skillSrcDir, 'SKILL.md'), '# Updated Skill');

    const destSkillsDir = path.join(fakeDestConfigDir, 'skills');
    fs.mkdirSync(destSkillsDir, { recursive: true });
    const destSkillDir = path.join(destSkillsDir, skillName);
    fs.mkdirSync(destSkillDir, { recursive: true });
    fs.writeFileSync(path.join(destSkillDir, 'SKILL.md'), '# Original Skill');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: skillName, sourcePath: path.join('src', 'skills', skillName) },
    ]);

    expect(result.installed).toHaveLength(0);
    expect(result.skippedExisting).toContain(skillName);
    expect(result.failed).toHaveLength(0);

    // Should not have overwritten
    expect(fs.readFileSync(path.join(destSkillDir, 'SKILL.md'), 'utf-8')).toBe(
      '# Original Skill',
    );
  });

  test('ignores non-skill directories without SKILL.md', async () => {
    const skillName = 'no-skill-md';
    const skillSrcDir = path.join(fakePackageRoot, 'src', 'skills', skillName);
    fs.mkdirSync(skillSrcDir, { recursive: true });
    fs.writeFileSync(path.join(skillSrcDir, 'other-file.txt'), 'hello');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: skillName, sourcePath: path.join('src', 'skills', skillName) },
    ]);

    expect(result.installed).toHaveLength(0);
    expect(result.skippedExisting).toHaveLength(0);
    expect(result.failed).toHaveLength(0);

    const destSkillDir = path.join(fakeDestConfigDir, 'skills', skillName);
    expect(fs.existsSync(destSkillDir)).toBe(false);
  });

  test('records failures and continues on errors', async () => {
    // We create one good skill and one bad skill to cause failure.
    // The good skill should still install.
    const goodSkill = 'good-skill';
    const goodSrcDir = path.join(fakePackageRoot, 'src', 'skills', goodSkill);
    fs.mkdirSync(goodSrcDir, { recursive: true });
    fs.writeFileSync(path.join(goodSrcDir, 'SKILL.md'), '# Good');

    // Use a source folder name that is valid by itself but makes the
    // `.sync-staging-${entry}-XXXXXX` temp directory basename exceed common
    // filesystem NAME_MAX limits. This is more deterministic than chmod-based
    // unreadable directories, which root can still read in CI containers.
    const badSkill = `bad-skill-${'x'.repeat(240)}`;
    const badSrcDir = path.join(fakePackageRoot, 'src', 'skills', badSkill);
    fs.mkdirSync(badSrcDir, { recursive: true });
    fs.writeFileSync(path.join(badSrcDir, 'SKILL.md'), '# Bad');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: goodSkill, sourcePath: path.join('src', 'skills', goodSkill) },
      { name: badSkill, sourcePath: path.join('src', 'skills', badSkill) },
    ]);

    expect(result.installed).toContain(goodSkill);
    expect(result.failed).toContain(badSkill);

    // Staging and final bad-skill dir helper cleanup checks
    const destSkillsDir = path.join(fakeDestConfigDir, 'skills');
    const badDestDir = path.join(destSkillsDir, badSkill);
    expect(fs.existsSync(badDestDir)).toBe(false);

    // Verify no staging directories are left behind in destSkillsDir
    const destEntries = fs.readdirSync(destSkillsDir);
    const stagingDirs = destEntries.filter((entry) =>
      entry.startsWith('.sync-staging-'),
    );
    expect(stagingDirs).toHaveLength(0);
  });

  test('missing source skills directory returns empty results and does not throw', async () => {
    // Delete the source skills directory entirely
    const sourceSkillsDir = path.join(fakePackageRoot, 'src', 'skills');
    fs.rmSync(sourceSkillsDir, { recursive: true, force: true });

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: 'missing-skill', sourcePath: path.join('src', 'skills') },
    ]);
    expect(result.installed).toHaveLength(0);
    expect(result.skippedExisting).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  test('creates destination skills parent directory when absent', async () => {
    // Delete the fake-config directory completely so even the parent is missing
    fs.rmSync(fakeDestConfigDir, { recursive: true, force: true });

    const skillName = 'auto-create-parent';
    const skillSrcDir = path.join(fakePackageRoot, 'src', 'skills', skillName);
    fs.mkdirSync(skillSrcDir, { recursive: true });
    fs.writeFileSync(path.join(skillSrcDir, 'SKILL.md'), '# Parent Created');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: skillName, sourcePath: path.join('src', 'skills', skillName) },
    ]);

    expect(result.installed).toContain(skillName);
    const destSkillDir = path.join(fakeDestConfigDir, 'skills', skillName);
    expect(fs.existsSync(destSkillDir)).toBe(true);
  });

  test('existing destination file/symlink is skipped and not overwritten', async () => {
    const skillName = 'file-blocking-skill';
    const skillSrcDir = path.join(fakePackageRoot, 'src', 'skills', skillName);
    fs.mkdirSync(skillSrcDir, { recursive: true });
    fs.writeFileSync(path.join(skillSrcDir, 'SKILL.md'), '# Target');

    const destSkillsDir = path.join(fakeDestConfigDir, 'skills');
    fs.mkdirSync(destSkillsDir, { recursive: true });
    const destSkillPath = path.join(destSkillsDir, skillName);

    // Create a regular file in place of the skill directory
    fs.writeFileSync(destSkillPath, 'I am a blocking file');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: skillName, sourcePath: path.join('src', 'skills', skillName) },
    ]);

    expect(result.installed).toHaveLength(0);
    expect(result.skippedExisting).toContain(skillName);
    expect(result.failed).toHaveLength(0);

    // Should still be the file, not a directory
    expect(fs.lstatSync(destSkillPath).isFile()).toBe(true);
    expect(fs.readFileSync(destSkillPath, 'utf-8')).toBe(
      'I am a blocking file',
    );
  });

  test('existing destination symlink is skipped and not overwritten', async () => {
    const skillName = 'symlink-blocking-skill';
    const skillSrcDir = path.join(fakePackageRoot, 'src', 'skills', skillName);
    fs.mkdirSync(skillSrcDir, { recursive: true });
    fs.writeFileSync(path.join(skillSrcDir, 'SKILL.md'), '# Target');

    const destSkillsDir = path.join(fakeDestConfigDir, 'skills');
    fs.mkdirSync(destSkillsDir, { recursive: true });
    const symlinkTarget = path.join(fakeDestConfigDir, 'custom-skill-target');
    fs.mkdirSync(symlinkTarget, { recursive: true });
    fs.writeFileSync(path.join(symlinkTarget, 'SKILL.md'), '# Custom');
    const destSkillPath = path.join(destSkillsDir, skillName);
    fs.symlinkSync(symlinkTarget, destSkillPath, 'dir');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: skillName, sourcePath: path.join('src', 'skills', skillName) },
    ]);

    expect(result.installed).toHaveLength(0);
    expect(result.skippedExisting).toContain(skillName);
    expect(result.failed).toHaveLength(0);
    expect(fs.lstatSync(destSkillPath).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(path.join(symlinkTarget, 'SKILL.md'), 'utf-8')).toBe(
      '# Custom',
    );
  });

  test('source symlink directories are ignored', async () => {
    const realSkill = 'real-skill';
    const realSrcDir = path.join(fakePackageRoot, 'src', 'skills', realSkill);
    fs.mkdirSync(realSrcDir, { recursive: true });
    fs.writeFileSync(path.join(realSrcDir, 'SKILL.md'), '# Real');

    const symlinkSkill = 'symlink-skill';
    const symlinkSrcDir = path.join(
      fakePackageRoot,
      'src',
      'skills',
      symlinkSkill,
    );

    // Create a symlink in source pointing to real-skill directory
    fs.symlinkSync(realSrcDir, symlinkSrcDir, 'dir');

    const result = await syncBundledSkillsFromPackage(fakePackageRoot, [
      { name: realSkill, sourcePath: path.join('src', 'skills', realSkill) },
      {
        name: symlinkSkill,
        sourcePath: path.join('src', 'skills', symlinkSkill),
      },
    ]);

    expect(result.installed).toContain(realSkill);
    expect(result.installed).not.toContain(symlinkSkill);
    expect(result.skippedExisting).toHaveLength(0);
    expect(result.failed).toHaveLength(0);

    const destSkillDir = path.join(fakeDestConfigDir, 'skills', symlinkSkill);
    expect(fs.existsSync(destSkillDir)).toBe(false);
  });
});
