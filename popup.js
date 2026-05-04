/**
 * Popup 脚本 - 管理扩展设置
 */

// 配置项定义
const SETTINGS = [
    { id: 'MasterSwitch', indicator: 'masterIndicator' },
    { id: 'LoginYZMSwitch', indicator: 'yzmIndicator' },
];

// 默认配置
const DEFAULT_OPTIONS = {
    MasterSwitch: true,
    LoginYZMSwitch: true,
};

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 显示版本号
    const version = chrome.runtime.getManifest().version;
    document.getElementById('version').textContent = `v${version}`;

    // 加载配置
    await loadSettings();

    // 绑定事件
    bindEvents();
    
    // 绑定网站按钮点击事件
    bindSiteButtons();
});

/**
 * 加载配置
 */
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
            SETTINGS.forEach(({ id, indicator }) => {
                const checkbox = document.getElementById(id);
                const indicatorEl = document.getElementById(indicator);
                
                if (checkbox) {
                    checkbox.checked = items[id];
                }
                
                if (indicatorEl) {
                    updateIndicator(indicatorEl, items[id] && items.MasterSwitch);
                }
            });
            
            // 如果主开关关闭，禁用子开关
            updateSubSwitchState(items.MasterSwitch);
            
            resolve();
        });
    });
}

/**
 * 绑定事件
 */
function bindEvents() {
    SETTINGS.forEach(({ id, indicator }) => {
        const checkbox = document.getElementById(id);
        if (!checkbox) return;

        checkbox.addEventListener('change', async (e) => {
            const value = e.target.checked;
            
            // 保存设置
            await saveOption(id, value);
            
            // 更新指示器
            const indicatorEl = document.getElementById(indicator);
            
            if (id === 'MasterSwitch') {
                // 主开关变化时，更新所有指示器
                updateSubSwitchState(value);
                updateAllIndicators();
            } else {
                // 子开关变化时，只更新自己
                const masterSwitch = document.getElementById('MasterSwitch');
                if (indicatorEl) {
                    updateIndicator(indicatorEl, value && masterSwitch.checked);
                }
            }
        });
    });
}

/**
 * 保存配置
 */
function saveOption(key, value) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [key]: value }, resolve);
    });
}

/**
 * 更新指示器状态
 */
function updateIndicator(element, isActive) {
    if (isActive) {
        element.classList.add('active');
    } else {
        element.classList.remove('active');
    }
}

/**
 * 更新子开关状态（禁用/启用）
 */
function updateSubSwitchState(masterEnabled) {
    const yzmSwitch = document.getElementById('LoginYZMSwitch');
    if (yzmSwitch) {
        yzmSwitch.disabled = !masterEnabled;
        yzmSwitch.parentElement.style.opacity = masterEnabled ? '1' : '0.5';
    }
}

/**
 * 更新所有指示器
 */
function updateAllIndicators() {
    const masterSwitch = document.getElementById('MasterSwitch');
    const masterEnabled = masterSwitch?.checked || false;
    
    SETTINGS.forEach(({ id, indicator }) => {
        const checkbox = document.getElementById(id);
        const indicatorEl = document.getElementById(indicator);
        
        if (checkbox && indicatorEl) {
            const isActive = id === 'MasterSwitch' 
                ? checkbox.checked 
                : checkbox.checked && masterEnabled;
            updateIndicator(indicatorEl, isActive);
        }
    });
}

/**
 * 绑定网站按钮点击事件
 */
function bindSiteButtons() {
    const siteButtons = document.querySelectorAll('.site-item');
    
    siteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const url = button.getAttribute('data-url');
            if (url) {
                chrome.tabs.create({ url });
            }
        });
    });
}
