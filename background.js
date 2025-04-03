// 监听代理设置变化
chrome.proxy.onProxyError.addListener(function(details) {
  console.error('代理错误:', details);
});

// 初始化时加载保存的代理设置
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['proxyHost', 'proxyPort', 'proxyType'], function(result) {
    if (result.proxyHost && result.proxyPort) {
      const config = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: result.proxyType || 'http',
            host: result.proxyHost,
            port: parseInt(result.proxyPort)
          }
        }
      };

      chrome.proxy.settings.set(
        {value: config, scope: 'regular'},
        function() {
          if (chrome.runtime.lastError) {
            console.error('初始化代理设置失败:', chrome.runtime.lastError);
          }
        }
      );
    }
  });
}); 