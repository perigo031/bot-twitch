require('events').EventEmitter.defaultMaxListeners = 50;

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

puppeteer.use(StealthPlugin());

const SETTINGS = {
    targetUrl: "https://www.kick.com/seu-canal", 
    viewCount: 20000,                         
    durationMinutes: 120,                        
    // Para rodar na Vercel/Cloud, você PRECISA de um Browserless Token ou URL de WebSocket
    // Exemplo: "wss://chrome.browserless.io?token=SEU_TOKEN"
    browserWssEndpoint: process.env.BROWSERLESS_WSS || null, 
    proxyGateway: null, 
    proxyAuth: null,
};

async function launchViewInstance(id) {
    let browser;
    try {
        const userAgents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

        const launchArgs = [
            '--no-sandbox',
            '--disable-setid-sandbox',
            '--disable-web-security',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            `--user-agent=${randomUA}`
        ];

        if (SETTINGS.proxyGateway) {
            launchArgs.push(`--proxy-server=${SETTINGS.proxyGateway}`);
        }

        // CORREÇÃO CRÍTICA: Se estiver na Vercel, conecta via WebSocket. Se for local, usa launch.
        if (SETTINGS.browserWssEndpoint) {
            browser = await puppeteer.connect({
                browserWssEndpoint: SETTINGS.browserWssEndpoint,
                defaultViewport: { width: 1280, height: 720 }
            });
        } else {
            browser = await puppeteer.launch({
                headless: 'new', 
                args: launchArgs,
                timeout: 60000
            });
        }

        const page = await browser.newPage();
        
        await page.setViewport({
            width: [1024, 1366, 1920][Math.floor(Math.random() * 3)],
            height: [768, 800, 1080][Math.floor(Math.random() * 3)],
        });

        if (SETTINGS.proxyAuth && SETTINGS.proxyGateway) {
            await page.authenticate({
                username: SETTINGS.proxyAuth.split(':')[0],
                password: SETTINGS.proxyAuth.split(':')[1],
            });
        }

        await page.goto(SETTINGS.targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 90000 
        });

        // Execução de script para garantir que o vídeo rode
        await page.evaluate(async () => {
            const playVideo = async () => {
                const video = document.querySelector('video');
                if (video) {
                    video.muted = true;
                    try { await video.play(); } catch(e) {}
                }
            };
            playVideo();
            setInterval(playVideo, 10000); // Tenta dar play a cada 10s se cair
        });

        console.log(`[SISTEMA] View #${id} conectada.`);

        // Em serverless, isso vai dar timeout. Em VPS, funciona.
        await new Promise(resolve => setTimeout(resolve, SETTINGS.durationMinutes * 60 * 1000));

    } catch (error) {
        console.error(`[ERRO] Instância #${id}: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

async function main() {
    console.log(`🚀 INICIANDO INJEÇÃO: ${SETTINGS.targetUrl}`);

    // Batch reduzido para evitar crash de memória
    const batchSize = 3; 
    let totalLaunched = 0;

    while (totalLaunched < SETTINGS.viewCount) {
        const currentBatch = [];
        for (let i = 0; i < batchSize && totalLaunched < SETTINGS.viewCount; i++) {
            totalLaunched++;
            currentBatch.push(launchViewInstance(totalLaunched));
        }
        await Promise.all(currentBatch);
        console.log(`📈 PROGRESSO: ${totalLaunched} / ${SETTINGS.viewCount}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

main().catch(console.error);
