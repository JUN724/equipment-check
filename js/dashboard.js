/**
 * 仪表盘页面
 * 路由: #dashboard (默认)
 */
function renderDashboard() {
  const today = getTodayStr();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let html = `
    <div class="page dashboard-page">
      <div class="page-header">
        <h1>📋 设备点检仪表盘</h1>
        <div class="header-date">${today}</div>
      </div>

      <nav class="main-nav">
        <a href="#dashboard" class="nav-item active">📊 仪表盘</a>
        <a href="#export" class="nav-item">📑 月度导出</a>
        <a href="#manage" class="nav-item">⚙️ 管理</a>
      </nav>

      <!-- 今日概览 -->
      <div class="section">
        <h2 class="section-title">今日点检概览</h2>
        <div class="today-cards" id="todayCards">
  `;

  // 四台设备卡片
  DEVICES.forEach(device => {
    const record = getRecord(device.id, today);
    const checked = !!record;
    let statusClass = 'unchecked';
    let statusText = '未点检';
    let detailHtml = '';

    if (checked) {
      const items = record.items || {};
      const abnormalCount = Object.values(items).filter(i => i.status === 'abnormal').length;
      if (abnormalCount > 0) {
        statusClass = 'abnormal';
        statusText = `${abnormalCount}项异常`;
      } else {
        statusClass = 'normal';
        statusText = '全部正常';
      }
      detailHtml = `<div class="card-time">点检时间：${record.timestamp}</div>`;
    }

    html += `
      <div class="device-card ${statusClass}" style="border-left-color: ${getDeviceColor(device.id)}">
        <div class="card-header">
          <span class="card-dot" style="background:${getDeviceColor(device.id)}"></span>
          <span class="card-name">${device.name}</span>
        </div>
        <div class="card-model">${device.model}</div>
        <div class="card-status status-${statusClass}">${statusText}</div>
        ${detailHtml}
        <div class="card-actions">
          <a href="#check/${device.id}" class="btn btn-sm btn-primary">${checked ? '重新点检' : '开始点检'}</a>
          <a href="#history/${device.id}" class="btn btn-sm btn-outline">历史</a>
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </div>

      <!-- 月历视图 -->
      <div class="section">
        <div class="section-title-row">
          <h2 class="section-title">月历视图</h2>
          <div class="month-selector">
            <button class="btn btn-sm btn-outline" id="btnPrevMonth">&larr;</button>
            <span class="month-label" id="monthLabel">${year}年${month}月</span>
            <button class="btn btn-sm btn-outline" id="btnNextMonth">&rarr;</button>
            <button class="btn btn-sm btn-outline" id="btnToday">今天</button>
          </div>
        </div>
        <div class="calendar-legend">
          ${DEVICES.map(d => `<span class="legend-item"><span class="legend-dot" style="background:${getDeviceColor(d.id)}"></span>${d.name.length > 8 ? d.name.substring(0,8)+'...' : d.name}</span>`).join('')}
        </div>
        <div class="calendar" id="calendar"></div>
        <div class="calendar-detail" id="calendarDetail" style="display:none;"></div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;

  // 渲染月历
  let currentYear = year;
  let currentMonth = month;

  function renderCalendar() {
    const dailyStatus = getMonthDailyStatus(currentYear, currentMonth);
    document.getElementById('monthLabel').textContent = `${currentYear}年${currentMonth}月`;

    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=周日
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    let calHtml = '<div class="cal-weekdays">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
      calHtml += `<div class="cal-weekday">${d}</div>`;
    });
    calHtml += '</div><div class="cal-grid">';

    // 填充前面的空白
    for (let i = 0; i < firstDay; i++) {
      calHtml += '<div class="cal-cell empty"></div>';
    }

    // 日期格子
    const todayStr = getTodayStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const status = dailyStatus[dateStr] || {};

      calHtml += `<div class="cal-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">`;
      calHtml += `<span class="cal-day ${isToday ? 'today-badge' : ''}">${d}</span>`;
      calHtml += '<div class="cal-dots">';

      DEVICES.forEach(device => {
        const s = status[device.id] || 'unchecked';
        calHtml += `<span class="cal-dot ${s}" style="background:${s === 'unchecked' ? '#e5e7eb' : getDeviceColor(device.id)}" title="${device.name}: ${s === 'normal' ? '正常' : s === 'abnormal' ? '异常' : '未点检'}"></span>`;
      });

      calHtml += '</div></div>';
    }

    calHtml += '</div>';
    document.getElementById('calendar').innerHTML = calHtml;

    // 绑定点击
    document.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', function () {
        const dateStr = this.dataset.date;
        showDateDetail(dateStr);
      });
    });
  }

  function showDateDetail(dateStr) {
    const detailEl = document.getElementById('calendarDetail');
    let detailHtml = `<h3>${dateStr} 点检详情</h3>`;

    let hasAny = false;
    DEVICES.forEach(device => {
      const record = getRecord(device.id, dateStr);
      if (record) {
        hasAny = true;
        const items = record.items || {};
        const abnormalCount = Object.values(items).filter(i => i.status === 'abnormal').length;
        detailHtml += `
          <div class="detail-device">
            <div class="detail-device-header">
              <span class="detail-dot" style="background:${getDeviceColor(device.id)}"></span>
              <strong>${device.name}</strong>
              <span class="badge ${abnormalCount > 0 ? 'badge-danger' : 'badge-success'}">${abnormalCount > 0 ? abnormalCount + '项异常' : '正常'}</span>
              <span class="detail-time">${record.timestamp}</span>
            </div>
        `;
        device.checks.forEach((check, i) => {
          const item = items[i] || { status: 'normal', note: '' };
          detailHtml += `
            <div class="detail-item ${item.status}">
              <span>${item.status === 'normal' ? '✓' : '✗'}</span>
              <span>${check}</span>
              ${item.note ? `<span class="detail-note">${item.note}</span>` : ''}
              ${item.photos && item.photos.length > 0 ? `<span class="detail-photos">📷${item.photos.length}张</span>` : ''}
            </div>
          `;
        });
        detailHtml += '</div>';
      }
    });

    if (!hasAny) {
      detailHtml += '<p class="empty-text">当天无点检记录</p>';
    }

    detailEl.innerHTML = detailHtml;
    detailEl.style.display = 'block';
  }

  renderCalendar();

  // 月份切换
  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    renderCalendar();
  });

  document.getElementById('btnNextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    renderCalendar();
  });

  document.getElementById('btnToday').addEventListener('click', () => {
    currentYear = new Date().getFullYear();
    currentMonth = new Date().getMonth() + 1;
    renderCalendar();
  });
}

/** 设备历史记录页 */
function renderHistory(deviceId) {
  const device = getDeviceById(deviceId);
  if (!device) {
    document.getElementById('app').innerHTML = '<div class="empty-state"><p>设备不存在</p></div>';
    return;
  }

  const dates = getDeviceDates(deviceId).reverse(); // 最新在前

  let html = `
    <div class="page history-page">
      <div class="page-header">
        <a href="#dashboard" class="back-btn">&larr; 返回</a>
        <h1>${device.name} - 点检历史</h1>
      </div>
  `;

  if (dates.length === 0) {
    html += '<div class="empty-state"><p>暂无点检记录</p></div>';
  } else {
    html += '<div class="history-list">';
    dates.forEach(dateStr => {
      const record = getRecord(deviceId, dateStr);
      const items = record.items || {};
      const abnormalCount = Object.values(items).filter(i => i.status === 'abnormal').length;

      html += `
        <div class="history-card">
          <div class="history-header">
            <span class="history-date">📅 ${dateStr}</span>
            <span class="history-time">${record.timestamp}</span>
            <span class="badge ${abnormalCount > 0 ? 'badge-danger' : 'badge-success'}">${abnormalCount > 0 ? abnormalCount + '项异常' : '正常'}</span>
          </div>
          <div class="history-items">
      `;

      device.checks.forEach((check, i) => {
        const item = items[i] || { status: 'normal', note: '' };
        html += `
          <div class="history-item ${item.status}">
            <span class="item-status">${item.status === 'normal' ? '✓' : '✗'}</span>
            <span class="item-text">${check}</span>
            ${item.note ? `<span class="item-note">备注：${item.note}</span>` : ''}
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  html += '</div>';
  document.getElementById('app').innerHTML = html;
}
