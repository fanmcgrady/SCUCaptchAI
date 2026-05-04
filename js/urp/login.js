import { getOption } from '../LoadOption.js';
import { imRead } from '../publicCode.js';

let isProcessing = false;

export async function main() {
    try {
        const options = await getOption();
        if (!options.LoginYZMSwitch) return;
        showLoadingSuccess();
        initCaptchaHandler();
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

function initCaptchaHandler() {
    const captchaImg = document.getElementById('captchaImg');
    if (!captchaImg) { console.warn('[SCUCaptchAI] 找不到验证码图片元素'); return; }

    captchaImg.addEventListener('load', () => fillCaptcha());
    waitForImage(captchaImg)
        .then(() => fillCaptcha())
        .catch(err => console.warn('[SCUCaptchAI] 等待图片失败:', err));
}

async function fillCaptcha() {
    if (isProcessing) return;
    isProcessing = true;
    try {
        const imageData = imRead('captchaImg', 180, 60, { isClass: false, normFactor: 255.0 });
        const result = await chrome.runtime.sendMessage({ ImageData: imageData, urp: true });
        if (result) {
            const input = document.getElementById('input_checkcode');
            if (input) {
                input.value = result;
                console.log('[SCUCaptchAI] 验证码已填写:', result);
            }
        }
    } catch (error) {
        console.error('[SCUCaptchAI] 验证码处理失败:', error);
    } finally {
        isProcessing = false;
    }
}
