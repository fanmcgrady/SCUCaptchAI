/**
 * 配置选项的默认值
 */
const DEFAULT_OPTIONS = {
    MasterSwitch: true,      // 总开关
    LoginYZMSwitch: true,    // 登录验证码自动填写
    AutoSubmitSwitch: true,  // 识别后自动登录
    ShowResultSwitch: true,  // 显示识别结果
};

/**
 * 获取配置选项（Promise版本）
 * @returns {Promise<Object>} 配置对象
 */
export function getOption() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
            const data = {};
            for (const key in items) {
                if (key.endsWith('Switch')) {
                    // 子开关受主开关控制
                    data[key] = items.MasterSwitch && items[key];
                }
            }
            resolve(data);
        });
    });
}

/**
 * 设置配置选项
 * @param {string} key - 配置键名
 * @param {*} value - 配置值
 * @returns {Promise<void>}
 */
export function setOption(key, value) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [key]: value }, resolve);
    });
}

/**
 * 获取所有配置（包含原始值，不受主开关影响）
 * @returns {Promise<Object>}
 */
export function getRawOptions() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
    });
}
