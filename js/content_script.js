/**
 * 统一门户验证码自动填写 (id.scu.edu.cn)
 */
(async () => {
    const src = chrome.runtime.getURL('./js/my/login.js');
    const module = await import(src);
    module.main();
})();

