import { getOption } from '../LoadOption.js';
import { imRead, sleep } from '../publicCode.js';

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

        modifyPage();
        initCaptchaHandler();
    } catch (error) {
        console.error('[SCUCaptchAI] 初始化失败:', error);
    }
}

/**
 * 修改页面元素
 */
function modifyPage() {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.innerHTML = '<span>免验证码登录</span>';

        // 回车键提交
        document.body.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    }
}

/**
 * 初始化验证码处理器
 */
function initCaptchaHandler() {
    const captchaImg = document.querySelector('.captcha-img');
    if (!captchaImg) {
        console.warn('[SCUCaptchAI] 找不到验证码图片元素');
        return;
    }

    // 图片加载完成时识别
    captchaImg.addEventListener('load', () => {
        fillCaptcha();
    });

    // 延迟后尝试首次识别（图片可能已经加载）
    sleep(500).then(fillCaptcha);
}

/**
 * 识别并填写验证码
 */
async function fillCaptcha() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // 读取验证码图片数据
        // 注意：my模型使用 /255/255 的归一化（原始代码如此）
        const imageData = imRead('captcha-img', 80, 26, {
            isClass: true,
            normFactor: 255.0 * 255.0
        });

        // 发送到background进行识别
        const result = await chrome.runtime.sendMessage({
            ImageData: imageData,
            my: true
        });

        if (result) {
            // 填写验证码
            const input = document.querySelector('.ivu-input.ivu-input-default:nth-of-type(3)') 
                || document.querySelector("input[placeholder='请输入验证码']");
            
            if (input) {
                input.value = result;
                // 触发input事件以更新Vue/React状态
                input.dispatchEvent(new InputEvent('input', {
                    data: result,
                    bubbles: true
                }));
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
