import { getOption } from '../LoadOption.js';
import { imRead } from '../publicCode.js';

// 防止重复识别的锁
let isProcessing = false;
const MAX_RETRIES = 3;

/**
 * 主入口函数
 */
export async function main() {
    try {
        const options = await getOption();
        if (!options.LoginYZMSwitch) {
            return;
        }

        showLoadingSuccess();
        initCaptchaHandler();
    } catch (error) {
        console.error('[SCUCaptchAI] 初始化失败:', error);
    }
}

/**
 * 显示加载成功提示
 */
function showLoadingSuccess() {
    const footer = document.querySelector('#formFooter');
    if (footer) {
        const hint = document.createElement('span');
        hint.style.cssText = 'color: #56baed; font-size: 0.8em; display: block; margin-top: 8px;';
        hint.textContent = 'SCUCaptchAI 验证码自动填写已启用';
        footer.appendChild(hint);
    }
}

/**
 * 等待图片真正加载完成
 */
function waitForImage(img, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
        }
        const timer = setTimeout(() => reject(new Error('图片加载超时')), timeout);
        img.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
        img.addEventListener('error', () => { clearTimeout(timer); reject(new Error('图片加载失败')); }, { once: true });
    });
}

/**
 * 初始化验证码处理器
 */
function initCaptchaHandler() {
    const captchaImg = document.getElementById('captchaImg');
    if (!captchaImg) {
        console.warn('[SCUCaptchAI] 找不到验证码图片元素');
        return;
    }

    // 图片加载完成时识别（处理验证码刷新）
    captchaImg.addEventListener('load', () => {
        fillCaptchaWithRetry();
    });

    // 首次尝试（图片可能已经加载完成）
    waitForImage(captchaImg)
        .then(() => fillCaptchaWithRetry())
        .catch(err => console.warn('[SCUCaptchAI] 等待图片失败:', err));
}

/**
 * 带重试的验证码识别入口
 */
async function fillCaptchaWithRetry() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const success = await fillCaptcha();
        if (success) return;
        if (attempt < MAX_RETRIES) {
            console.log(`[SCUCaptchAI] 第 ${attempt} 次识别失败，刷新验证码重试...`);
            // 点击验证码图片刷新
            document.getElementById('captchaImg')?.click();
            const img = document.getElementById('captchaImg');
            if (img) {
                await waitForImage(img).catch(() => {});
            }
        }
    }
    console.warn('[SCUCaptchAI] 验证码识别失败，已达最大重试次数');
}

/**
 * 识别并填写验证码，返回是否成功
 */
async function fillCaptcha() {
    if (isProcessing) return false;
    isProcessing = true;

    try {
        const imageData = imRead('captchaImg', 180, 60, {
            isClass: false,
            normFactor: 255.0
        });

        const result = await chrome.runtime.sendMessage({
            ImageData: imageData,
            urp: true
        });

        if (result) {
            const input = document.getElementById('input_checkcode');
            if (input) {
                input.value = result;
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
