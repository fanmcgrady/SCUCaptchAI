/**
 * 教务系统验证码自动填写 (zhjw.scu.edu.cn)
 */
(async () => {
    const src = chrome.runtime.getURL('./js/urp/login.js');
    const module = await import(src);
    module.main();
})();

