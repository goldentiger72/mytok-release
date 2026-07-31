// Bun은 .env를 자동 로딩하므로 dotenv 불필요

const OBSIDIAN_URL = (process.env.OBSIDIAN_API_URL || 'http://127.0.0.1:27123').replace(/\/$/, '');
const OBSIDIAN_KEY = process.env.OBSIDIAN_API_KEY || '';

// 로컬 HTTPS Self-Signed SSL 에러 우회 처리
if (OBSIDIAN_URL.startsWith('https://')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Obsidian API 호출 공통 헬퍼
 * @param {string} method 
 * @param {string} endpoint 
 * @param {object|string} body 
 * @param {object} headers 
 */
async function request(method, endpoint, body = null, headers = {}) {
  if (!OBSIDIAN_KEY) {
    throw new Error('Obsidian API Key가 .env 파일에 설정되지 않았습니다.');
  }

  const url = `${OBSIDIAN_URL}${endpoint}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${OBSIDIAN_KEY}`,
      ...headers
    }
  };

  if (body) {
    if (typeof body === 'object') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }
  }

  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const errText = await res.text().catch(() => 'No detail');
      const err = new Error(`Obsidian API 요청 실패: ${res.statusText}`);
      err.status = res.status;
      err.details = errText;
      throw err;
    }
    
    // JSON 응답인 경우 파싱하여 반환, 그 외 텍스트 반환
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch (error) {
    console.error(`[Obsidian API Error] ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Obsidian 볼트 내 노트 검색 (검색어 기반)
 * @param {string} query 
 */
async function searchNotes(query) {
  // Obsidian Local REST API의 search 엔드포인트 활용 (json query 형식 또는 simple text)
  // 일반적으로 POST /search 또는 GET /search 이용
  // /search 엔드포인트는 query를 받아서 관련 매칭 리스트를 던집니다.
  return await request('POST', '/search', { query }, {
    'Accept': 'application/json'
  });
}

/**
 * Obsidian 노트 정보 조회
 * @param {string} notePath - 볼트 내 상대 경로 (예: "Inbox/Note.md")
 */
async function getNote(notePath) {
  const encPath = encodeURIComponent(notePath);
  return await request('GET', `/vault/${encPath}`, null, {
    'Accept': 'text/markdown'
  });
}

/**
 * Obsidian 노트 생성 및 저장
 * @param {string} notePath - 볼트 내 상대 경로
 * @param {string} content - 저장할 마크다운 텍스트
 */
async function saveNote(notePath, content) {
  const encPath = encodeURIComponent(notePath);
  // PUT 요청으로 해당 경로에 파일을 생성/덮어씁니다.
  await request('PUT', `/vault/${encPath}`, content, {
    'Content-Type': 'text/markdown'
  });
  
  // 성공 시 obsidian:// 프로토콜용 open URL 반환
  const vaultName = OBSIDIAN_URL.split('/').pop() || 'MyVault'; // 임시로 추출하거나 기본값
  return {
    success: true,
    path: notePath,
    obsidian_url: `obsidian://open?file=${encodeURIComponent(notePath)}`
  };
}

export {
  searchNotes,
  getNote,
  saveNote
};

export default { searchNotes, getNote, saveNote };
