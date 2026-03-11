import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function update() {
    if (!process.env.GH_TOKEN) {
        console.error("❌ GH_TOKEN environment variable is not set.");
        process.exit(1);
    }
    console.log("🚀 Updating updater.json metadata...");

    const packagePath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = pkg.version;
    const tag = process.argv[2] || `v${version}`;
    const repo = "volkanglm/QualityOpen-Releases";

    console.log(`Targeting release: ${tag} (App version: ${version})`);

    try {
        const assetsJson = execSync(
            `gh release view ${tag} --repo ${repo} --json assets`,
            { stdio: ['pipe', 'pipe', 'pipe'] }
        ).toString();
        const assets = JSON.parse(assetsJson).assets;

        console.log("Release assets found:", assets.map(a => a.name));

        const updater = {
            version: version,
            notes: `QualityOpen ${tag} update.`,
            pub_date: new Date().toISOString(),
            platforms: {}
        };

        // Download signature content via curl using the asset's browser_download_url
        const getSignature = (sigAsset) => {
            try {
                // Use the asset URL directly with curl (works for public repos)
                const sig = execSync(
                    `curl -sL "${sigAsset.url}"`,
                    { stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 }
                ).toString().trim();

                if (!sig || sig.includes('Not Found') || sig.includes('<html')) {
                    console.warn(`  ⚠️  Signature content invalid for ${sigAsset.name}`);
                    return null;
                }
                console.log(`  ✅ Downloaded signature for ${sigAsset.name} (${sig.length} chars)`);
                return sig;
            } catch (e) {
                console.warn(`  ⚠️  Failed to download ${sigAsset.name}: ${e.message}`);
                return null;
            }
        };

        // macOS arm64
        const macArmBundle = assets.find(a => a.name.includes('aarch64') && a.name.endsWith('.app.tar.gz'));
        const macArmSig = assets.find(a => a.name.includes('aarch64') && a.name.endsWith('.app.tar.gz.sig'));

        if (macArmBundle && macArmSig) {
            console.log(`Found macOS arm64: ${macArmBundle.name}`);
            const sig = getSignature(macArmSig);
            if (sig) updater.platforms['darwin-aarch64'] = { signature: sig, url: macArmBundle.url };
        }

        // macOS x64
        const macX64Bundle = assets.find(a => a.name.includes('x64') && a.name.endsWith('.app.tar.gz'));
        const macX64Sig = assets.find(a => a.name.includes('x64') && a.name.endsWith('.app.tar.gz.sig'));

        if (macX64Bundle && macX64Sig) {
            console.log(`Found macOS x64: ${macX64Bundle.name}`);
            const sig = getSignature(macX64Sig);
            if (sig) updater.platforms['darwin-x86_64'] = { signature: sig, url: macX64Bundle.url };
        }

        // Generic macOS fallback (no arch in name)
        if (!updater.platforms['darwin-aarch64'] && !updater.platforms['darwin-x86_64']) {
            const genericBundle = assets.find(a => a.name.endsWith('.app.tar.gz'));
            const genericSig = assets.find(a => a.name.endsWith('.app.tar.gz.sig'));
            if (genericBundle && genericSig) {
                console.log(`Found generic macOS: ${genericBundle.name}`);
                const sig = getSignature(genericSig);
                if (sig) {
                    updater.platforms['darwin-aarch64'] = { signature: sig, url: genericBundle.url };
                    updater.platforms['darwin-x86_64'] = { signature: sig, url: genericBundle.url };
                }
            }
        }

        // Windows
        const winBundle = assets.find(a => a.name.endsWith('.nsis.zip'));
        const winSig = assets.find(a => a.name.endsWith('.nsis.zip.sig'));

        if (winBundle && winSig) {
            console.log(`Found Windows: ${winBundle.name}`);
            const sig = getSignature(winSig);
            if (sig) updater.platforms['windows-x86_64'] = { signature: sig, url: winBundle.url };
        }

        console.log(`\nPlatforms resolved: ${Object.keys(updater.platforms).join(', ') || 'NONE'}`);

        if (Object.keys(updater.platforms).length === 0) {
            console.error('❌ CRITICAL: No platform signatures could be downloaded.');
            console.error('   Check that PUBLIC_REPO_TOKEN has read access and .sig files exist.');
            process.exit(1);
        }

        fs.writeFileSync(path.join(__dirname, '../updater.json'), JSON.stringify(updater, null, 2));
        console.log("🎉 updater.json updated successfully!");
    } catch (err) {
        console.error("❌ Error:");
        console.error(err.stderr ? err.stderr.toString() : err.message);
        process.exit(1);
    }
}

update().catch(err => {
    console.error("❌ UNCAUGHT:", err.message);
    process.exit(1);
});
