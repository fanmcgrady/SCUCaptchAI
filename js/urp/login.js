import { getOption } from '../LoadOption.js';
import { imRead } from '../publicCode.js';

// 防止重复识别的锁
let isProcessing = false;

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
 * 初始化验证码处理器
 */
function initCaptchaHandler() {
    const captchaImg = document.getElementById('captchaImg');
    if (!captchaImg) {
        console.warn('[SCUCaptchAI] 找不到验证码图片元素');
        return;
    }

    // 图片加载完成时识别
    captchaImg.addEventListener('load', () => {
        fillCaptcha();
    });

    // 立即尝试识别（图片可能已经加载）
    fillCaptcha();
}

/**
 * 识别并填写验证码
 */
async function fillCaptcha() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // 读取验证码图片数据
        const imageData = imRead('captchaImg', 180, 60, {
            isClass: false,
            normFactor: 255.0
        });

        // 发送到background进行识别
        const result = await chrome.runtime.sendMessage({
            ImageData: imageData,
            urp: true
        });

        if (result) {
            // 填写验证码
            const input = document.getElementById('input_checkcode');
            if (input) {
                input.value = result;
                console.log('[SCUCaptchAI] 验证码已填写:', result);
            }
        } else {
            console.warn('[SCUCaptchAI] 验证码识别失败');
        }
    } catch (error) {
        console.error('[SCUCaptchAI] 验证码处理失败:', error);
    } finally {
        isProcessing = false;
    }
}
