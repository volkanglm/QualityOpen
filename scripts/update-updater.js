import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function update() {
    console.log("🚀 Updating updater.json metadata...");

    const packagePath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = pkg.version;
    const tag = `v${version}`;
    const repo = "volkanglm/QualityOpen-Releases";

    console.log(`Detected version: ${version} (${tag})`);

    try {
        // Use GH CLI to list assets
        const assetsJson = execSync(`gh release view ${tag} --repo ${repo} --json assets`).toString();
        const assets = JSON.parse(assetsJson).assets;

        console.log("Release assets found:", assets.map(a => a.name));

        const updater = {
            version: version,
            notes: `QualityOpen ${tag} update.`,
            pub_date: new Date().toISOString(),
            platforms: {}
        };

        // Flexible asset finder: tries each suffix pattern in order, returns first match
        const findAsset = (...suffixes) => {
            for (const suffix of suffixes) {
                const found = assets.find(a => a.name.endsWith(suffix));
                if (found) return found;
            }
            return null;
        };

        // macOS: Tauri may produce arch-specific names OR generic name
        // macos-latest runner is arm64 (aarch64), so we map to darwin-aarch64
        const macBundle = findAsset('aarch64.app.tar.gz', 'x64.app.tar.gz', '.app.tar.gz');
        const macSig = findAsset('aarch64.app.tar.gz.sig', 'x64.app.tar.gz.sig', '.app.tar.gz.sig');

        if (macBundle && macSig) {
            console.log(`✅ Found macOS assets: ${macBundle.name} + ${macSig.name}`);
            const sigContent = execSync(
                `gh release download ${tag} --repo ${repo} --file ${macSig.name} --output -`
            ).toString().trim();

            // Determine which darwin target based on the bundle name
            const isX64 = macBundle.name.includes('x64');
            const target = isX64 ? 'darwin-x86_64' : 'darwin-aarch64';
            updater.platforms[target] = { signature: sigContent, url: macBundle.url };
            console.log(`  → Mapped to ${target}`);
        } else {
            if (!macBundle) console.warn('⚠️  No macOS .app.tar.gz bundle found');
            if (!macSig)    console.warn('⚠️  No macOS .app.tar.gz.sig signature found (signing key configured?)');
        }

        // Windows: NSIS updater bundle
        const winBundle = findAsset('x64-setup.nsis.zip');
        const winSig    = findAsset('x64-setup.nsis.zip.sig');

        if (winBundle && winSig) {
            console.log(`✅ Found Windows assets: ${winBundle.name} + ${winSig.name}`);
            const sigContent = execSync(
                `gh release download ${tag} --repo ${repo} --file ${winSig.name} --output -`
            ).toString().trim();
            updater.platforms['windows-x86_64'] = { signature: sigContent, url: winBundle.url };
        } else {
            if (!winBundle) console.warn('⚠️  No Windows .nsis.zip bundle found');
            if (!winSig)    console.warn('⚠️  No Windows .nsis.zip.sig signature found');
        }

        if (Object.keys(updater.platforms).length === 0) {
            console.error('❌ No platform assets found — updater.json will have empty platforms.');
            console.error('   Make sure TAURI_SIGNING_PRIVATE_KEY is set and builds completed.');
        }

        fs.writeFileSync(path.join(__dirname, '../updater.json'), JSON.stringify(updater, null, 2));
        console.log("🎉 updater.json updated successfully!");
        console.log("Platforms:", Object.keys(updater.platforms));
    } catch (err) {
        console.error("❌ GitHub CLI error. Make sure you are logged in ('gh auth login') and the release exists.");
        throw err;
    }
}

update().catch(err => {
    console.error("❌ Failed to update updater.json:", err.message);
    process.exit(1);
});
