document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded');
  
  // 获取DOM元素
  const proxyHost = document.getElementById('proxyHost');
  const proxyPort = document.getElementById('proxyPort');
  const proxyType = document.getElementById('proxyType');
  const saveButton = document.getElementById('saveProxy');
  const clearButton = document.getElementById('clearProxy');
  const status = document.getElementById('status');

  // 检查Chrome API是否可用
  if (typeof chrome === 'undefined' || !chrome.proxy) {
    showStatus('Chrome API不可用，请确保插件已正确安装', 'error');
    return;
  }

  // 加载保存的代理设置
  chrome.storage.local.get(['proxyHost', 'proxyPort', 'proxyType'], function(result) {
    console.log('Loaded saved settings:', result);
    if (result.proxyHost) proxyHost.value = result.proxyHost;
    if (result.proxyPort) proxyPort.value = result.proxyPort;
    if (result.proxyType) proxyType.value = result.proxyType;
  });

  // 保存代理设置
  saveButton.addEventListener('click', function() {
    const host = proxyHost.value.trim();
    const port = proxyPort.value.trim();
    const type = proxyType.value;

    if (!host || !port) {
      showStatus('请填写完整的代理信息', 'error');
      return;
    }

    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: type,
          host: host,
          port: parseInt(port)
        }
      }
    };

    console.log('Saving proxy config:', config);

    // 保存到存储
    chrome.storage.local.set({
      proxyHost: host,
      proxyPort: port,
      proxyType: type
    }, function() {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        showStatus('保存设置失败：' + chrome.runtime.lastError.message, 'error');
        return;
      }
    });

    // 设置代理
    chrome.proxy.settings.set(
      {value: config, scope: 'regular'},
      function() {
        if (chrome.runtime.lastError) {
          console.error('Proxy setting error:', chrome.runtime.lastError);
          showStatus('设置代理失败：' + chrome.runtime.lastError.message, 'error');
        } else {
          showStatus('代理设置已保存', 'success');
        }
      }
    );
  });

  // 清除代理设置
  clearButton.addEventListener('click', function() {
    chrome.proxy.settings.clear({scope: 'regular'}, function() {
      if (chrome.runtime.lastError) {
        console.error('Clear proxy error:', chrome.runtime.lastError);
        showStatus('清除代理失败：' + chrome.runtime.lastError.message, 'error');
      } else {
        proxyHost.value = '';
        proxyPort.value = '';
        proxyType.value = 'http';
        chrome.storage.local.remove(['proxyHost', 'proxyPort', 'proxyType'], function() {
          if (chrome.runtime.lastError) {
            console.error('Storage remove error:', chrome.runtime.lastError);
          }
        });
        showStatus('代理设置已清除', 'success');
      }
    });
  });

  // 显示状态信息
  function showStatus(message, type) {
    console.log('Status:', message, type);
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => {
      status.className = 'status';
    }, 3000);
  }
}); 