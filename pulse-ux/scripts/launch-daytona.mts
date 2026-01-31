/**
 * Daytona Sandbox Launcher for Pulse UX Optimizer
 * 
 * Creates a Daytona sandbox, clones the repo, installs dependencies,
 * starts dev servers, and returns preview URLs.
 */
import { Daytona } from '@daytonaio/sdk';

const REPO_URL = 'https://github.com/shlawgathon/pulse.git';
const BRANCH = 'soon_to_be_merged';
const WORKSPACE_PATH = 'workspace/pulse';

async function main() {
    console.log('🚀 Initializing Daytona SDK...');

    const daytona = new Daytona({
        apiKey: process.env.DAYTONA_API_KEY,
        apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api',
        target: 'us',
    });

    console.log('📦 Creating sandbox...');
    const sandbox = await daytona.create({
        language: 'typescript',
    });

    console.log(`✅ Sandbox created: ${sandbox.id}`);

    try {
        // Clone the repository
        console.log('📥 Cloning repository...');
        await sandbox.git.clone(REPO_URL, WORKSPACE_PATH, BRANCH);
        console.log('✅ Repository cloned');

        // Install bun
        console.log('📦 Installing Bun...');
        await sandbox.process.executeCommand(
            'curl -fsSL https://bun.sh/install | bash',
            WORKSPACE_PATH
        );
        console.log('✅ Bun installed');

        // Install Node.js dependencies
        console.log('📦 Installing Node.js dependencies...');
        await sandbox.process.executeCommand(
            'export PATH="$HOME/.bun/bin:$PATH" && bun install',
            `${WORKSPACE_PATH}/pulse-ux`
        );
        console.log('✅ Node.js dependencies installed');

        // Install Python dependencies (uv)
        console.log('🐍 Installing Python dependencies...');
        await sandbox.process.executeCommand(
            'pip install uv && uv sync',
            `${WORKSPACE_PATH}/pulse-ux/apps/api`
        );
        console.log('✅ Python dependencies installed');

        // Create .env.local for the web app
        console.log('⚙️ Creating environment configuration...');
        const webEnvContent = `NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=daytona-dev-secret
`;
        await sandbox.fs.uploadFile(
            Buffer.from(webEnvContent),
            `${WORKSPACE_PATH}/pulse-ux/apps/web/.env.local`
        );

        // Create .env for the API
        const apiEnvContent = `MONGODB_URI=mongodb://localhost:27017/pulse
REDIS_URL=redis://localhost:6379
SECRET_KEY=daytona-dev-secret
`;
        await sandbox.fs.uploadFile(
            Buffer.from(apiEnvContent),
            `${WORKSPACE_PATH}/pulse-ux/apps/api/.env`
        );
        console.log('✅ Environment configured');

        // Create sessions for background processes
        console.log('🌐 Starting dev servers...');

        // Create frontend session
        await sandbox.process.createSession('frontend');
        await sandbox.process.executeSessionCommand('frontend', {
            command: `cd ${WORKSPACE_PATH}/pulse-ux/apps/web && export PATH="$HOME/.bun/bin:$PATH" && bun run dev`,
            runAsync: true,
        });

        // Create backend session
        await sandbox.process.createSession('backend');
        await sandbox.process.executeSessionCommand('backend', {
            command: `cd ${WORKSPACE_PATH}/pulse-ux/apps/api && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000`,
            runAsync: true,
        });

        console.log('✅ Dev servers started');

        // Wait for servers to initialize
        console.log('⏳ Waiting for servers to initialize...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get preview URLs
        const frontendPreview = await sandbox.getSignedPreviewUrl(3000, 3600);
        const backendPreview = await sandbox.getSignedPreviewUrl(8000, 3600);

        console.log('\n🎉 Sandbox is ready!');
        console.log('━'.repeat(50));
        console.log(`📱 Frontend: ${frontendPreview.url}`);
        console.log(`🔌 Backend API: ${backendPreview.url}`);
        console.log(`🆔 Sandbox ID: ${sandbox.id}`);
        console.log('━'.repeat(50));
        console.log('\n💡 Tip: URLs are valid for 1 hour. The sandbox will auto-stop after 15 minutes of inactivity.');

        return {
            sandboxId: sandbox.id,
            frontendUrl: frontendPreview.url,
            backendUrl: backendPreview.url,
        };
    } catch (error) {
        console.error('❌ Error setting up sandbox:', error);
        console.log('🧹 Cleaning up sandbox...');
        await sandbox.delete();
        throw error;
    }
}

main().catch(console.error);
