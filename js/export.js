/**
 * 月度导出页 & 管理页
 * 路由: #export, #manage
 */

/** 月度导出页 */
function renderExport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let html = `
    <div class="page export-page">
      <div class="page-header">
        <a href="#dashboard" class="back-btn">&larr; 返回</a>
        <h1>月度点检报表导出</h1>
      </div>

      <div class="export-controls">
        <div class="export-row">
          <label>选择月份：</label>
          <select id="exportYear" class="select-input">
  `;
  for (let y = year - 1; y <= year + 1; y++) {
    html += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}年</option>`;
  }
  html += `</select>
          <select id="exportMonth" class="select-input">`;
  for (let m = 1; m <= 12; m++) {
    html += `<option value="${m}" ${m === month ? 'selected' : ''}>${m}月</option>`;
  }
  html += `
          </select>
          <button class="btn btn-primary" id="btnGenerate">生成报表</button>
          <button class="btn btn-outline" id="btnExportCSV" style="display:none;">导出CSV</button>
          <button class="btn btn-outline" id="btnPrint" style="display:none;">🖨️ 打印</button>
        </div>
      </div>

      <div id="reportArea"></div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;

  document.getElementById('btnGenerate').addEventListener('click', () => {
    const y = parseInt(document.getElementById('exportYear').value);
    const m = parseInt(document.getElementById('exportMonth').value);
    generateReport(y, m);
  });
}

function generateReport(year, month) {
  const records = getAllRecords();
  const daysInMonth = new Date(year, month, 0).getDate();

  let html = `
    <div class="report-container">
      <div class="report-header">
        <h2>设备点检月报表</h2>
        <p>${year}年${month}月</p>
        <p class="report-date">生成时间：${getNowStr()}</p>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>日期</th>
            ${DEVICES.map(d => `<th>${d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name}</th>`).join('')}
            <th>汇总</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][new Date(year, month - 1, d).getDay()];

    html += `<tr>
      <td class="date-cell">
        <span class="date-day">${d}</span>
        <span class="date-week">周${dayOfWeek}</span>
      </td>`;

    let daySummary = { checked: 0, abnormal: 0 };

    DEVICES.forEach(device => {
      const key = `device_${device.id}`;
      const record = (records[key] && records[key][dateStr]) || null;

      if (record) {
        daySummary.checked++;
        const items = record.items || {};
        const hasAbnormal = Object.values(items).some(i => i.status === 'abnormal');
        if (hasAbnormal) {
          daySummary.abnormal++;
          html += `<td class="cell-abnormal">⚠ 异常</td>`;
        } else {
          html += `<td class="cell-normal">✓ 正常</td>`;
        }
      } else {
        html += `<td class="cell-unchecked">—</td>`;
      }
    });

    const summaryText = daySummary.checked === 0 ? '未点检'
      : daySummary.checked === 4 && daySummary.abnormal === 0 ? '全部正常'
      : `${daySummary.checked}/4已检 ${daySummary.abnormal > 0 ? daySummary.abnormal + '项异常' : ''}`;
    html += `<td class="cell-summary">${summaryText}</td>`;

    html += '</tr>';
  }

  html += `
        </tbody>
      </table>

      <div class="report-summary">
        <h3>月度统计</h3>
        <div class="summary-grid">
  `;

  DEVICES.forEach(device => {
    const key = `device_${device.id}`;
    const deviceRecords = records[key] || {};
    let checked = 0, abnormal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (deviceRecords[dateStr]) {
        checked++;
        const items = deviceRecords[dateStr].items || {};
        if (Object.values(items).some(i => i.status === 'abnormal')) abnormal++;
      }
    }
    html += `
      <div class="summary-card">
        <div class="summary-name">${device.name.length > 10 ? device.name.substring(0, 10) + '...' : device.name}</div>
        <div class="summary-nums">
          <span class="summary-checked">${checked}/${daysInMonth}天已检</span>
          ${abnormal > 0 ? `<span class="summary-abnormal">${abnormal}天异常</span>` : ''}
        </div>
        <div class="summary-bar">
          <div class="bar-fill" style="width:${Math.round(checked / daysInMonth * 100)}%; background:${getDeviceColor(device.id)}"></div>
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </div>
    </div>
  `;

  document.getElementById('reportArea').innerHTML = html;
  document.getElementById('btnExportCSV').style.display = 'inline-block';
  document.getElementById('btnPrint').style.display = 'inline-block';

  // CSV导出
  document.getElementById('btnExportCSV').onclick = () => exportCSV(year, month);

  // 打印
  document.getElementById('btnPrint').onclick = () => {
    const reportHtml = document.getElementById('reportArea').innerHTML;
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head><title>设备点检月报表 ${year}年${month}月</title>
        <style>
          body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 12px; }
          th { background: #f0f0f0; }
          .cell-normal { color: #059669; }
          .cell-abnormal { color: #dc2626; font-weight: bold; }
          .cell-unchecked { color: #999; }
          .report-header { text-align: center; margin-bottom: 20px; }
          .report-summary { margin-top: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .summary-card { border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
          .summary-bar { height: 8px; background: #e5e7eb; border-radius: 4px; margin-top: 6px; }
          .bar-fill { height: 100%; border-radius: 4px; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>${reportHtml}</body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 500);
  };
}

function exportCSV(year, month) {
  const records = getAllRecords();
  const daysInMonth = new Date(year, month, 0).getDate();

  // BOM for Excel Chinese support
  let csv = '\uFEFF';
  csv += '日期,';
  DEVICES.forEach(d => { csv += `"${d.name}",`; });
  csv += '汇总\n';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    csv += `${dateStr},`;
    let checked = 0, abnormal = 0;

    DEVICES.forEach(device => {
      const key = `device_${device.id}`;
      const record = (records[key] && records[key][dateStr]) || null;
      if (record) {
        checked++;
        const items = record.items || {};
        if (Object.values(items).some(i => i.status === 'abnormal')) {
          abnormal++;
          csv += '异常,';
        } else {
          csv += '正常,';
        }
      } else {
        csv += '未点检,';
      }
    });

    csv += checked === 0 ? '未点检' : `${checked}/4已检`;
    csv += '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `设备点检月报_${year}年${month}月.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 管理页 */
function renderManage() {
  const records = getAllRecords();
  let totalRecords = 0;
  for (const devKey of Object.keys(records)) {
    totalRecords += Object.keys(records[devKey]).length;
  }

  // 估算存储大小
  const sizeKB = (new Blob([JSON.stringify(records)]).size / 1024).toFixed(1);

  let html = `
    <div class="page manage-page">
      <div class="page-header">
        <a href="#dashboard" class="back-btn">&larr; 返回</a>
        <h1>⚙️ 系统管理</h1>
      </div>

      <div class="section">
        <h2 class="section-title">二维码打印</h2>
        <p class="section-desc">打印四台设备的点检二维码，贴在设备上供技术员扫码点检</p>
        <button class="btn btn-primary" id="btnQRCodes">生成并打印二维码</button>
      </div>

      <div class="section">
        <h2 class="section-title">数据管理</h2>
        <div class="data-info">
          <div class="info-item">
            <span class="info-label">点检记录总数：</span>
            <span class="info-value">${totalRecords} 条</span>
          </div>
          <div class="info-item">
            <span class="info-label">存储占用：</span>
            <span class="info-value">约 ${sizeKB} KB</span>
          </div>
        </div>
        <div class="data-actions">
          <button class="btn btn-primary" id="btnExportData">📥 导出数据备份</button>
          <button class="btn btn-outline" id="btnImportData">📤 导入数据备份</button>
          <button class="btn btn-outline" id="btnCleanOld">🧹 清理90天前数据</button>
          <button class="btn btn-danger" id="btnClearAll">🗑️ 清除所有数据</button>
        </div>
        <input type="file" id="importFileInput" accept=".json" style="display:none;">
      </div>

      <div class="section">
        <h2 class="section-title">设备配置</h2>
        <table class="config-table">
          <thead><tr><th>#</th><th>设备名称</th><th>型号</th><th>点检项数</th><th>二维码</th></tr></thead>
          <tbody>
  `;

  DEVICES.forEach(d => {
    const url = window.location.origin + window.location.pathname + '#check/' + d.id;
    html += `
      <tr>
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.model}</td>
        <td>${d.checks.length}项</td>
        <td><a href="#check/${d.id}" class="btn btn-sm btn-outline">点检链接</a></td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
        <p class="hint-text">提示：点检链接可在微信/浏览器中打开。如需二维码，点击上方「生成并打印二维码」按钮。</p>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;

  // 绑定按钮事件
  document.getElementById('btnQRCodes').addEventListener('click', renderQRCodes);
  document.getElementById('btnExportData').addEventListener('click', exportAllData);

  document.getElementById('btnImportData').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  document.getElementById('importFileInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) {
      try {
        await importData(e.target.files[0]);
        alert('数据导入成功！页面将刷新。');
        renderManage();
      } catch (err) {
        alert('导入失败：' + err);
      }
    }
  });

  document.getElementById('btnCleanOld').addEventListener('click', () => {
    if (confirm('将清理90天之前的点检数据，建议先导出备份。确定继续？')) {
      const count = cleanOldData(90);
      alert(`已清理 ${count} 条旧记录。`);
      renderManage();
    }
  });

  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (clearAllData()) {
      renderManage();
    }
  });
}

/** 生成二维码打印页 */
function renderQRCodes() {
  const baseUrl = window.location.origin + window.location.pathname;

  let html = `
    <div class="page qr-page">
      <div class="page-header">
        <a href="#manage" class="back-btn">&larr; 返回</a>
        <h1>设备点检二维码</h1>
        <button class="btn btn-primary btn-print-qr" onclick="window.print()">🖨️ 打印二维码</button>
      </div>
      <p class="section-desc">请使用 A4 纸打印，裁剪后贴在对应设备上</p>
      <div class="qr-grid">
  `;

  DEVICES.forEach(device => {
    const url = baseUrl + '#check/' + device.id;
    html += `
      <div class="qr-card">
        <div class="qr-device-name">${device.name}</div>
        <div class="qr-device-model">${device.model}</div>
        <div class="qr-code" id="qrcode_${device.id}"></div>
        <div class="qr-hint">微信扫码点检</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;

  // 动态加载 qrcode 库并生成二维码
  loadQRCodeLib().then(() => {
    DEVICES.forEach(device => {
      const url = baseUrl + '#check/' + device.id;
      const container = document.getElementById('qrcode_' + device.id);
      if (container && typeof QRCode !== 'undefined') {
        new QRCode(container, {
          text: url,
          width: 150,
          height: 150,
          colorDark: '#1f2937',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    });
  });
}

/** 动态加载 QRCode 库 */
function loadQRCodeLib() {
  return new Promise((resolve) => {
    if (typeof QRCode !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('QRCode库加载失败，使用备用方案');
      resolve();
    };
    document.head.appendChild(script);
  });
}
