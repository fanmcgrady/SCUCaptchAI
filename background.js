import * as tf from './js/tf.fesm.js';
import { getOption } from './js/LoadOption.js';
import { nShapeArray } from './js/publicCode.js';

// 验证码字符集
const CHARACTERS = '0123456789abcdefghijklmnopqrstuvwxyz';

// 模型缓存
let modelUrp = null;
let modelMy = null;

/**
 * 加载URP教务系统验证码识别模型
 * @param {boolean} warmup - 是否预热模型
 */
async function loadModelUrp(warmup = false) {
    try {
        modelUrp = await tf.loadLayersModel(chrome.runtime.getURL('model/urp/model.json'));
        if (warmup) {
            tf.tidy(() => {
                modelUrp.predict(tf.tensor4d(nShapeArray(1, 1, 60, 180, 3)));
            });
        }
        console.log('[SCUCaptchAI] URP模型加载成功');
    } catch (error) {
        console.error('[SCUCaptchAI] URP模型加载失败:', error);
        throw error;
    }
}

/**
 * 加载统一门户验证码识别模型
 * @param {boolean} warmup - 是否预热模型
 */
async function loadModelMy(warmup = false) {
    try {
        modelMy = await tf.loadLayersModel(chrome.runtime.getURL('model/my/model.json'));
        if (warmup) {
            tf.tidy(() => {
                modelMy.predict(tf.tensor4d(nShapeArray(1, 1, 26, 80, 3)));
            });
        }
        console.log('[SCUCaptchAI] MY模型加载成功');
    } catch (error) {
        console.error('[SCUCaptchAI] MY模型加载失败:', error);
        throw error;
    }
}

/**
 * 使用模型识别验证码
 * @param {Array} imageData - 图片数据
 * @param {tf.LayersModel} model - 模型
 * @returns {string} 识别结果
 */
function recognizeCaptcha(imageData, model) {
    return tf.tidy(() => {
        const tensor = tf.tensor4d(imageData);
        const predictions = model.predict(tensor);
        
        return predictions.reduce((result, item) => {
            const index = item.as1D().argMax().arraySync();
            return result + CHARACTERS[index];
        }, '');
    });
}

/**
 * 处理来自content script的消息
 * @param {Object} request - 请求对象
 * @returns {Promise<string|null>} 识别结果
 */
async function handleMessage(request) {
    try {
        const options = await getOption();
        
        if (!options.LoginYZMSwitch) {
            return null;
        }

        if (!request.ImageData) {
            return null;
        }

        // URP教务系统验证码
        if (request.urp) {
            if (!modelUrp) {
                await loadModelUrp(false);
            }
            return recognizeCaptcha(request.ImageData, modelUrp);
        }

        // 统一门户验证码
        if (request.my) {
            if (!modelMy) {
                await loadModelMy(false);
            }
            return recognizeCaptcha(request.ImageData, modelMy);
        }

        return null;
    } catch (error) {
        console.error('[SCUCaptchAI] 验证码识别失败:', error);
        return null;
    }
}

// 初始化：预加载模型
async function init() {
    try {
        const options = await getOption();
        if (options.LoginYZMSwitch) {
            await Promise.all([
                loadModelUrp(true),
                loadModelMy(true)
            ]);
        }
    } catch (error) {
        console.error('[SCUCaptchAI] 初始化失败:', error);
    }
}

init();

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request)
        .then(sendResponse)
        .catch((error) => {
            console.error('[SCUCaptchAI] 消息处理失败:', error);
            sendResponse(null);
        });
    return true; // 保持消息通道开放
});

// 更新通知
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'update') {
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: 'img/logo.png',
            title: 'SCUCaptchAI 已更新',
            message: `当前版本: ${chrome.runtime.getManifest().version}`
        });
    }
});
