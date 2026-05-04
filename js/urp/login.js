import { getOption } from '../LoadOption.js';
import { imRead } from '../publicCode.js';

let isProcessing = false;
const MAX_RETRIES = 3;

export async function main() {
    try {
        const options = await getOption();
        if (!options.LoginYZMSwitch) return;
        showLoadingSuccess();
        initCaptchaHandler(options);
    } catch (error) {
        console.error('[SCUCaptchAI] 初始化失败:', error);
    }
}

function showLoadingSuccess() {
    const footer = document.querySelector('#formFooter');
    if (footer) {
        const hint = document.createElement('span');
        hint.style.cssText = 'color: #56baed; font-size: 0.8em; display: block; margin-top: 8px;';
        hint.textContent = 'SCUCaptchAI 验证码自动填写已启用';
        footer.appendChild(hint);
    }
}

function waitForImage(img, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) { resolve(); return; }
        const timer = setTimeout(() => reject(new Error('图片加载超时')), timeout);
        img.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
        img.addEventListener('error', () => { clearTimeout(timer); reject(new Error('图片加载失败')); }, { once: true });
    });
}

function showResult(text) {
    let el = document.getElementById('scucaptchai-result');
    if (!el) {
        el = document.createElement('span');
        el.id = 'scucaptchai-result';
        el.style.cssText = 'font-size:11px;color:#4caf50;margin-left:8px;vertical-align:middle;';
        document.getElementById('captchaImg')?.insertAdjacentElement('afterend', el);
    }
    el.textContent = `识别: ${text}`;
}

function initCaptchaHandler(options) {
    const captchaImg = document.getElementById('captchaImg');
    if (!captchaImg) { console.warn('[SCUCaptchAI] 找不到验证码图片元素'); return; }

    captchaImg.addEventListener('load', () => fillCaptchaWithRetry(options));
    waitForImage(captchaImg)
        .then(() => fillCaptchaWithRetry(options))
        .catch(err => console.warn('[SCUCaptchAI] 等待图片失败:', err));
}

async function fillCaptchaWithRetry(options) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const success = await fillCaptcha(options);
        if (success) return;
        if (attempt < MAX_RETRIES) {
            console.log(`[SCUCaptchAI] 第 ${attempt} 次识别失败，刷新重试...`);
            document.getElementById('captchaImg')?.click();
            const img = document.getElementById('captchaImg');
            if (img) await waitForImage(img).catch(() => {});
        }
    }
    console.warn('[SCUCaptchAI] 验证码识别失败，已达最大重试次数');
}

async function fillCaptcha(options) {
    if (isProcessing) return false;
    isProcessing = true;
    try {
        const imageData = imRead('captchaImg', 180, 60, { isClass: false, normFactor: 255.0 });
        const result = await chrome.runtime.sendMessage({ ImageData: imageData, urp: true });
        if (result) {
            const input = document.getElementById('input_checkcode');
            if (input) {
                input.value = result;
                if (options.ShowResultSwitch) showResult(result);
                if (options.AutoSubmitSwitch) setTimeout(() => {
                    const btn = document.getElementById('loginBtn')
                        || document.querySelector('input[type=submit]')
                        || document.querySelector('button[type=submit]');
                    btn?.click();
                }, 300);
                console.log('[SCUCaptchAI] 验证码已填写:', result);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('[SCUCaptchAI] 验证码处理失败:', error);
        return false;
    } finally {
        isProcessing = false;
    }
}
