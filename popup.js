document.addEventListener('DOMContentLoaded', () => {
  const proxyHost = document.getElementById('proxyHost');
  const proxyPort = document.getElementById('proxyPort');
  const proxyType = document.getElementById('proxyType');
  const saveButton = document.getElementById('saveProxy');
  const clearButton = document.getElementById('clearProxy');
  const proxyState = document.getElementById('proxyState');
  const controlState = document.getElementById('controlState');
  const status = document.getElementById('status');

  let statusTimerId = 0;

  if (typeof chrome === 'undefined' || !chrome.proxy?.settings) {
    showStatus('Chrome API不可用，请确保插件已正确安装', 'error');
    return;
  }

  refreshProxyState();

  saveButton.addEventListener('click', () => {
    if (saveButton.disabled) {
      return;
    }

    const host = proxyHost.value.trim();
    const portText = proxyPort.value.trim();
    const type = proxyType.value;
    const validationError = validateProxyInput(host, portText);

    if (validationError) {
      showStatus(validationError, 'error');
      return;
    }

    const config = {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: type,
          host,
          port: Number(portText)
        }
      }
    };

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
      if (chrome.runtime.lastError) {
        showStatus('设置代理失败：' + chrome.runtime.lastError.message, 'error');
        return;
      }

      showStatus('代理设置已保存', 'success');
      refreshProxyState();
    });
  });

  clearButton.addEventListener('click', () => {
    if (clearButton.disabled) {
      return;
    }

    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      if (chrome.runtime.lastError) {
        showStatus('清除代理失败：' + chrome.runtime.lastError.message, 'error');
        return;
      }

      clearInputs();
      showStatus('代理设置已清除', 'success');
      refreshProxyState();
    });
  });

  function refreshProxyState() {
    chrome.proxy.settings.get({ incognito: false }, (details) => {
      if (chrome.runtime.lastError) {
        showStatus('读取当前代理失败：' + chrome.runtime.lastError.message, 'error');
        return;
      }

      updateControlState(details.levelOfControl);
      updateProxyState(details.value);
    });
  }

  function updateControlState(levelOfControl) {
    let message = '控制状态：当前可由本扩展控制';
    let className = 'info';
    let canControl = true;

    switch (levelOfControl) {
      case 'controlled_by_this_extension':
        message = '控制状态：当前由本扩展控制';
        className = 'info success';
        break;
      case 'controllable_by_this_extension':
        break;
      case 'controlled_by_other_extensions':
        message = '控制状态：当前被其他扩展控制，无法修改';
        className = 'info warning';
        canControl = false;
        break;
      case 'not_controllable':
        message = '控制状态：当前由浏览器策略控制，无法修改';
        className = 'info warning';
        canControl = false;
        break;
      default:
        message = '控制状态：浏览器未返回控制状态';
        break;
    }

    controlState.textContent = message;
    controlState.className = className;
    saveButton.disabled = !canControl;
    clearButton.disabled = !canControl;
  }

  function updateProxyState(value) {
    const mode = value?.mode ?? 'system';

    if (mode === 'fixed_servers') {
      const singleProxy = value.rules?.singleProxy;
      const scheme = singleProxy?.scheme ?? 'http';

      if (!singleProxy?.host || singleProxy.port == null) {
        clearInputs();
        proxyState.textContent = '当前代理：已设置固定代理，但不是此插件支持的单代理格式';
        proxyState.className = 'info warning';
        return;
      }

      proxyState.textContent = `当前代理：${scheme.toUpperCase()} ${singleProxy.host}:${singleProxy.port}`;

      if (scheme !== 'http' && scheme !== 'socks5') {
        clearInputs();
        proxyState.className = 'info warning';
        return;
      }

      proxyHost.value = singleProxy.host;
      proxyPort.value = String(singleProxy.port);
      proxyType.value = scheme;
      proxyState.className = 'info success';
      return;
    }

    clearInputs();
    proxyState.className = 'info';

    switch (mode) {
      case 'direct':
        proxyState.textContent = '当前代理：直连，不使用代理';
        break;
      case 'system':
        proxyState.textContent = '当前代理：使用系统代理设置';
        break;
      case 'auto_detect':
        proxyState.textContent = '当前代理：自动检测代理';
        break;
      case 'pac_script':
        proxyState.textContent = '当前代理：使用 PAC 脚本';
        break;
      default:
        proxyState.textContent = '当前代理：未知模式';
        proxyState.className = 'info warning';
        break;
    }
  }

  function clearInputs() {
    proxyHost.value = '';
    proxyPort.value = '';
    proxyType.value = 'http';
  }

  function validateProxyInput(host, portText) {
    if (!host || !portText) {
      return '请填写完整的代理信息';
    }

    if (!isValidHost(host)) {
      return '请输入有效的代理服务器地址';
    }

    if (!/^\d+$/.test(portText)) {
      return '端口必须是 1 到 65535 之间的整数';
    }

    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return '端口必须是 1 到 65535 之间的整数';
    }

    return '';
  }

  function isValidHost(host) {
    if (!host || /\s/.test(host) || /[/?#@]/.test(host) || host.includes('://')) {
      return false;
    }

    const colonCount = (host.match(/:/g) || []).length;
    if (colonCount === 1 && !host.startsWith('[') && !host.endsWith(']')) {
      return false;
    }

    return true;
  }

  function showStatus(message, type) {
    if (statusTimerId) {
      clearTimeout(statusTimerId);
    }

    status.textContent = message;
    status.className = 'status ' + type;
    statusTimerId = window.setTimeout(() => {
      status.className = 'status';
      statusTimerId = 0;
    }, 3000);
  }
});
