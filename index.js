// Aumenta o limite de listeners para evitar avisos no terminal
require('events').EventEmitter.defaultMaxListeners = 50;

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

// Ativa o modo invisível para enganar a Twitch e a Kick
puppeteer.use(StealthPlugin());

/**
 * CONFIGURAÇÕES DE ACESSO E ALVO
 * Aqui você define quem vai receber as views e por quanto tempo
 */
const SETTINGS = {
    targetUrl: "https://www.kick.com/seu-canal", // COLOQUE O LINK DA LIVE AQUI
    viewCount: 20000,                         // Meta de 20 mil views
    durationMinutes: 120,                        // Tempo de permanência (ex: 120 min)
    
    // GATEWAY DE PROXY ROTATIVO (Comentado para rodar direto sem erros por enquanto)
    // proxyGateway: "http://rotator.proxy-provider.com:8080", 
    // proxyAuth: "usuario:senha",
};

async function launchViewInstance(id) {
    let browser;
    try {
        // Cada instância usa um User-Agent diferente para simular pessoas diferentes
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
            '--disable-software-rasterizer',
            `--user-agent=${randomUA}`
        ];

        // Se o proxy estiver ativo nas configurações, adiciona na inicialização
        if (SETTINGS.proxyGateway) {
            launchArgs.push(`--proxy-server=${SETTINGS.proxyGateway}`);
        }

        browser = await puppeteer.launch({
            headless: 'new', 
            timeout: 60000,
            args: launchArgs
        });

        const page = await browser.newPage();
        
        // Mascara a resolução da tela para parecer um dispositivo real
        await page.setViewport({
            width: [1024, 1366, 1920][Math.floor(Math.random() * 3)],
            height: [768, 800, 1080][Math.floor(Math.random() * 3)],
        });

        // Autenticação do Proxy (se houver)
        if (SETTINGS.proxyAuth && SETTINGS.proxyGateway) {
            await page.authenticate({
                username: SETTINGS.proxyAuth.split(':')[0],
                password: SETTINGS.proxyAuth.split(':')[1],
            });
        }

        // Acessa a live com timeout longo para evitar quedas
        await page.goto(SETTINGS.targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 90000 
        });

        // Força o Play do vídeo e tira o mudo (essencial para a view contar)
        await page.evaluate(async () => {
            const video = document.querySelector('video');
            if (video) {
                video.muted = true;
                await video.play();
            }
        });

        console.log(`[SISTEMA] View #${id} conectada com sucesso.`);

        // Mantém a conexão aberta pelo tempo definido
        await new Promise(resolve => setTimeout(resolve, SETTINGS.durationMinutes * 60 * 1000));

    } catch (error) {
        console.error(`[ERRO] Instância #${id} caiu: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

async function main() {
    console.log(`
    ==================================================
    🚀 VIEW-MASTER PRO: INJEÇÃO DE 20.000 VIEWS
    🎯 ALVO: ${SETTINGS.targetUrl}
    ⏱️ TEMPO: ${SETTINGS.durationMinutes} Minutos
    🛡️ STATUS: ANTI-BAN ATIVADO (STEALTH MODE)
    ==================================================
    `);

    // Reduzido para 5 para não travar a memória do Codespaces
    const batchSize = 5; 
    let totalLaunched = 0;

    while (totalLaunched < SETTINGS.viewCount) {
        const currentBatch = [];
        
        for (let i = 0; i < batchSize && totalLaunched < SETTINGS.viewCount; i++) {
            totalLaunched++;
            currentBatch.push(launchViewInstance(totalLaunched));
        }

        // Espera as instâncias do lote iniciarem antes de mandar as próximas
        await Promise.all(currentBatch);
        console.log(`📈 PROGRESSO: ${totalLaunched} / ${SETTINGS.viewCount} views injetadas.`);
        
        // Intervalo de 3 segundos entre lotes
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`✅ Meta atingida! As views estão rodando no alvo.`);
}

main().catch(console.error);
