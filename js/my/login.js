import { getOption } from '../LoadOption.js';
import { imRead } from '../publicCode.js';

let isProcessing = false;
const MAX_RETRIES = 3;

export async function main() {
    try {
        const options = await getOption();
        if (!options.LoginYZMSwitch) return;
        modifyPage();
        initCaptchaHandler();
    } catch (error) {
        console.error('[SCUCaptchAI] 初始化失败:', error);
    }
}

function modifyPage() {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.innerHTML = '<span>免验证码登录</span>';
        document.body.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
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
    const captchaImg = document.querySelector('.captcha-img');
    if (!captchaImg) { console.warn('[SCUCaptchAI] 找不到验证码图片元素'); return; }

    captchaImg.addEventListener('load', () => fillCaptchaWithRetry());
    waitForImage(captchaImg)
        .then(() => fillCaptchaWithRetry())
        .catch(err => console.warn('[SCUCaptchAI] 等待图片失败:', err));
}

async function fillCaptchaWithRetry() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const success = await fillCaptcha();
        if (success) return;
        if (attempt < MAX_RETRIES) {
            console.log(`[SCUCaptchAI] 第 ${attempt} 次识别失败，刷新重试...`);
            document.querySelector('.captcha-img')?.click();
            const img = document.querySelector('.captcha-img');
            if (img) await waitForImage(img).catch(() => {});
        }
    }
    console.warn('[SCUCaptchAI] 验证码识别失败，已达最大重试次数');
}

async function fillCaptcha() {
    if (isProcessing) return false;
    isProcessing = true;
    try {
        const imageData = imRead('captcha-img', 80, 26, { isClass: true, normFactor: 255.0 * 255.0 });
        const result = await chrome.runtime.sendMessage({ ImageData: imageData, my: true });
        if (result) {
            const input = document.querySelector("input[placeholder='请输入验证码']")
                || document.querySelector('.ivu-input.ivu-input-default:nth-of-type(3)');
            if (input) {
                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
                if (nativeSetter) {
                    nativeSetter.call(input, result);
                } else {
                    input.value = result;
                }
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
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
