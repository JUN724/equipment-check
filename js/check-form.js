/**
 * 点检表单页
 * 路由: #check/:deviceId
 */
function renderCheckForm(deviceId) {
  const device = getDeviceById(deviceId);
  if (!device) {
    document.getElementById('app').innerHTML = `<div class="empty-state"><p>设备不存在</p><a href="#dashboard">返回首页</a></div>`;
    return;
  }

  const now = getNowStr();

  let html = `
    <div class="page check-page">
      <div class="page-header">
        <a href="#dashboard" class="back-btn">&larr; 返回</a>
        <h1>设备点检</h1>
      </div>

      <div class="check-device-info">
        <div class="device-name">${device.name}</div>
        <div class="device-model">型号：${device.model}</div>
        <div class="check-time" id="liveTime">点检时间：${now}</div>
      </div>

      <div class="check-form" id="checkForm">
        <div class="check-section-title">点检项目</div>
  `;

  device.checks.forEach((item, index) => {
    html += `
      <div class="check-item" data-index="${index}">
        <div class="check-item-header">
          <span class="check-item-num">${index + 1}</span>
          <span class="check-item-text">${item}</span>
          <div class="check-item-btns">
            <button class="btn-status btn-normal active" data-idx="${index}" data-status="normal">✓ 正常</button>
            <button class="btn-status btn-abnormal" data-idx="${index}" data-status="abnormal">✗ 异常</button>
          </div>
        </div>
        <div class="check-item-detail" id="detail_${index}" style="display:none;">
          <textarea class="note-input" id="note_${index}" placeholder="异常说明（必填）..." rows="2"></textarea>
          <div class="photo-area" id="photos_${index}">
            <button class="btn-photo" data-idx="${index}">📷 拍照记录</button>
            <span class="photo-count" id="photoCount_${index}">最多3张</span>
          </div>
          <div class="photo-previews" id="previews_${index}"></div>
        </div>
      </div>
    `;
  });

  html += `
        <div class="check-actions">
          <button class="btn btn-primary btn-submit" id="btnSubmit">提交点检</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;

  // 实时更新时间
  setInterval(() => {
    const el = document.getElementById('liveTime');
    if (el) el.textContent = '点检时间：' + getNowStr();
  }, 1000);

  // 状态存储（内存中，提交时统一保存）
  const itemStates = {};
  device.checks.forEach((_, i) => {
    itemStates[i] = { status: 'normal', note: '', photos: [] };
  });
  // 暴露给全局以支持照片删除回调
  window._itemStates = itemStates;

  // 绑定正常/异常按钮
  document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.dataset.idx);
      const status = this.dataset.status;

      // 更新按钮样式
      const parent = this.parentElement;
      parent.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // 更新状态
      itemStates[idx].status = status;

      // 显示/隐藏详情区域
      const detail = document.getElementById('detail_' + idx);
      if (status === 'abnormal') {
        detail.style.display = 'block';
      } else {
        detail.style.display = 'none';
        itemStates[idx].note = '';
        itemStates[idx].photos = [];
      }
    });
  });

  // 绑定备注输入
  document.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('input', function () {
      const idx = parseInt(this.id.replace('note_', ''));
      itemStates[idx].note = this.value;
    });
  });

  // 绑定拍照按钮
  document.querySelectorAll('.btn-photo').forEach(btn => {
    btn.addEventListener('click', async function () {
      const idx = parseInt(this.dataset.idx);
      if (itemStates[idx].photos.length >= MAX_PHOTOS_PER_ITEM) {
        alert('每项最多拍摄3张照片');
        return;
      }

      try {
        this.textContent = '📷 拍照中...';
        this.disabled = true;
        const photo = await capturePhoto();
        itemStates[idx].photos.push(photo);
        renderPhotoPreviews(idx, itemStates[idx].photos);
      } catch (e) {
        console.log('拍照取消或失败:', e);
      } finally {
        this.textContent = '📷 拍照记录';
        this.disabled = false;
        document.getElementById('photoCount_' + idx).textContent =
          `${itemStates[idx].photos.length}/3张`;
      }
    });
  });

  // 提交按钮
  document.getElementById('btnSubmit').addEventListener('click', () => {
    // 验证异常项是否填写了说明
    for (const idx of Object.keys(itemStates)) {
      if (itemStates[idx].status === 'abnormal' && !itemStates[idx].note.trim()) {
        alert(`请为"${device.checks[idx]}"填写异常说明`);
        return;
      }
    }

    const today = getTodayStr();
    const record = {
      timestamp: getNowStr(),
      technician: '',
      items: {}
    };

    for (const idx of Object.keys(itemStates)) {
      record.items[idx] = {
        status: itemStates[idx].status,
        note: itemStates[idx].note,
        photos: itemStates[idx].photos
      };
    }

    saveRecord(deviceId, today, record);

    // 显示成功
    const formEl = document.getElementById('checkForm');
    formEl.innerHTML = `
      <div class="success-state">
        <div class="success-icon">✅</div>
        <h2>点检提交成功！</h2>
        <p>${device.name}</p>
        <p class="success-time">提交时间：${record.timestamp}</p>
        <div class="success-summary">
          ${Object.values(record.items).filter(i => i.status === 'abnormal').length > 0
            ? `<span class="badge badge-danger">${Object.values(record.items).filter(i => i.status === 'abnormal').length} 项异常</span>`
            : '<span class="badge badge-success">全部正常</span>'}
        </div>
        <a href="#dashboard" class="btn btn-primary" style="margin-top:20px;">返回首页</a>
        <button class="btn btn-outline" style="margin-top:10px;" onclick="renderCheckForm(${deviceId})">再次点检（覆盖）</button>
      </div>
    `;
  });
}

/** 渲染照片预览 */
function renderPhotoPreviews(idx, photos) {
  const container = document.getElementById('previews_' + idx);
  if (!container) return;

  let html = '';
  photos.forEach((photo, pi) => {
    html += `
      <div class="photo-thumb">
        <img src="${photo}" alt="照片${pi + 1}">
        <button class="photo-delete" data-idx="${idx}" data-pi="${pi}">×</button>
      </div>
    `;
  });
  container.innerHTML = html;

  // 绑定删除按钮（使用闭包中正确的 photos 引用）
  container.querySelectorAll('.photo-delete').forEach(btn => {
    btn.addEventListener('click', function () {
      const i = parseInt(this.dataset.idx);
      const p = parseInt(this.dataset.pi);
      // 从 DOM 中移除
      this.parentElement.remove();
      // 同步更新 itemStates
      if (window._itemStates && window._itemStates[i]) {
        window._itemStates[i].photos.splice(p, 1);
      }
      // 重新渲染（因为 splice 后索引变了）
      const updatedPhotos = window._itemStates && window._itemStates[i] ? window._itemStates[i].photos : [];
      renderPhotoPreviews(i, updatedPhotos);
    });
  });
}
