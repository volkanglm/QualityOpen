const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function update() {
    console.log("🚀 Updating updater.json metadata...");

    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const version = pkg.version;
    const tag = `v${version}`;
    const repo = "volkanglm/QualityOpen";

    console.log(`Detected version: ${version} (${tag})`);

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
        "darwin-x86_64": { ext: "x64.dmg.tar.gz", sigExt: "x64.dmg.tar.gz.sig" },
        "darwin-aarch64": { ext: "aarch64.dmg.tar.gz", sigExt: "aarch64.dmg.tar.gz.sig" },
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
}

update().catch(err => {
    console.error("❌ Failed to update updater.json:", err);
    process.exit(1);
});
