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
    const repo = "volkanglm/QualityOpen";

    console.log(`Detected version: ${version} (${tag})`);

    try {
        // Use GH CLI to list assets
        const assetsJson = execSync(`gh release view ${tag} --repo ${repo} --json assets`).toString();
        const assets = JSON.parse(assetsJson).assets;

        const updater = {
            version: version,
            notes: `QualityOpen ${tag} update.`,
            pub_date: new Date().toISOString(),
            platforms: {}
        };

        const findAsset = (ext) => assets.find(a => a.name.endsWith(ext));

        const platforms = {
            "darwin-x86_64": { ext: "x64.app.tar.gz", sigExt: "x64.app.tar.gz.sig" },
            "darwin-aarch64": { ext: "aarch64.app.tar.gz", sigExt: "aarch64.app.tar.gz.sig" },
            "windows-x86_64": { ext: "x64-setup.nsis.zip", sigExt: "x64-setup.nsis.zip.sig" }
        };

        for (const [key, config] of Object.entries(platforms)) {
            const asset = findAsset(config.ext);
            const sigAsset = findAsset(config.sigExt);

            if (asset && sigAsset) {
                console.log(`✅ Found assets for ${key}`);

                // Download signature content
                const sigContent = execSync(`gh release download ${tag} --repo ${repo} --file ${sigAsset.name} --output -`).toString().trim();

                updater.platforms[key] = {
                    signature: sigContent,
                    url: asset.url
                };
            } else {
                console.warn(`⚠️  Missing assets for ${key}`);
            }
        }

        fs.writeFileSync(path.join(__dirname, '../updater.json'), JSON.stringify(updater, null, 2));
        console.log("🎉 updater.json updated successfully!");
    } catch (err) {
        console.error("❌ GitHub CLI error. Make sure you are logged in ('gh auth login') and the release exists.");
        throw err;
    }
}

update().catch(err => {
    console.error("❌ Failed to update updater.json:", err.message);
    process.exit(1);
});

