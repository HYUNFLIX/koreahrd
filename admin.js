// Firebase SDK 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  Timestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase 구성
const firebaseConfig = {
  apiKey: "AIzaSyD7yKQdpxyd_zMuuGPxeNeq3VL66fd66RE",
  authDomain: "koreahrd-e93bf.firebaseapp.com",
  projectId: "koreahrd-e93bf",
  storageBucket: "koreahrd-e93bf.firebasestorage.app",
  messagingSenderId: "821852289871",
  appId: "1:821852289871:web:9d929ee358ecdc04fda33a",
  measurementId: "G-GC1YMLDZ6L"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM 요소
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const loginSpinner = document.getElementById('login-spinner');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');
const paymentsSpinner = document.getElementById('payments-spinner');
const submitSpinner = document.getElementById('submit-spinner');
const addPaymentBtn = document.getElementById('add-payment-btn');
const excelDownloadBtn = document.getElementById('excel-download-btn');
const paymentModal = document.getElementById('payment-modal');
const modalTitle = document.getElementById('modal-title');
const paymentForm = document.getElementById('payment-form');
const closeBtn = document.querySelector('.close');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resetSearchBtn = document.getElementById('reset-search-btn');

// 전역 변수
let allPayments = []; // 모든 결제 내역 저장
let currentSort = { field: 'memberType', order: 'asc' }; // 현재 정렬 상태

// 화면 크기에 따라 테이블 컬럼 조절
function adjustTableColumns() {
  const isMobile = window.innerWidth <= 768;
  const optionalColumns = document.querySelectorAll('.optional-column');
  
  optionalColumns.forEach(col => {
    if (isMobile) {
      col.style.display = 'none';
    } else {
      col.style.display = '';
    }
  });
}

// 화면 크기 변경 감지
window.addEventListener('resize', adjustTableColumns);

// 로그인 로직
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  loginSpinner.style.display = 'block';
  loginError.textContent = '';
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // 로그인 성공 시 자동으로 onAuthStateChanged에서 처리됨
  } catch (error) {
    console.error("로그인 에러:", error);
    loginError.textContent = '로그인 실패: ' + error.message;
    loginSpinner.style.display = 'none';
  }
});

// 로그아웃 로직
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    // 로그아웃 성공 시 자동으로 onAuthStateChanged에서 처리됨
  } catch (error) {
    console.error("로그아웃 에러:", error);
  }
});

// 인증 상태 변경 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 사용자가 로그인한 경우
    loginSection.style.display = 'none';
    appContainer.style.display = 'block';
    userEmail.textContent = user.email;
    loginSpinner.style.display = 'none';
    
    // 데이터 로드
    loadPayments();
    
    // 정렬 헤더 이벤트 설정
    setupSortableHeaders();
    
    // 화면 크기에 맞게 테이블 조정
    adjustTableColumns();
  } else {
    // 사용자가 로그아웃한 경우
    loginSection.style.display = 'block';
    appContainer.style.display = 'none';
    userEmail.textContent = '';
  }
});

// 테이블 헤더에 정렬 기능 추가
function setupSortableHeaders() {
  const headers = document.querySelectorAll('th.sortable');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      
      // 현재 정렬 필드와 같으면 방향 전환, 아니면 새로운 필드로 오름차순 정렬
      if (currentSort.field === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.order = 'asc';
      }
      
      // 정렬 표시 업데이트
      headers.forEach(h => {
        h.classList.remove('active');
        h.removeAttribute('data-order');
      });
      
      header.classList.add('active');
      header.setAttribute('data-order', currentSort.order === 'asc' ? '↑' : '↓');
      
      // 테이블 재정렬
      displayPayments(allPayments);
    });
  });
}

// 납부 등록 모달 열기
addPaymentBtn.addEventListener('click', () => {
  // 폼 초기화
  paymentForm.reset();
  document.getElementById('payment-id').value = '';
  document.getElementById('payment-date').valueAsDate = new Date();
  modalTitle.textContent = '회비 납부 등록';
  document.getElementById('submit-btn').textContent = '등록하기';
  
  // 모달 표시
  paymentModal.style.display = 'block';
});

// 회원 구분에 따른 자동 금액 설정
document.getElementById('member-type').addEventListener('change', function() {
  const memberType = this.value;
  const amountInput = document.getElementById('amount');
  
  if (memberType === '평생회원') {
    amountInput.value = 500000;
  } else if (memberType === '졸업생') {
    amountInput.value = 50000;
  } else if (memberType === '재학생') {
    amountInput.value = 30000;
  } else {
    amountInput.value = '';
  }
});

// 모달 닫기
closeBtn.addEventListener('click', () => {
  paymentModal.style.display = 'none';
});

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
  if (e.target == paymentModal) {
    paymentModal.style.display = 'none';
  }
});

// 이름 검색 기능
searchBtn.addEventListener('click', () => {
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    const filteredPayments = allPayments.filter(payment => 
      payment.name.toLowerCase().includes(searchTerm)
    );
    displayPayments(filteredPayments);
  } else {
    displayPayments(allPayments);
  }
});

// 검색 초기화
resetSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  displayPayments(allPayments);
});

// 검색창에서 엔터 키 이벤트
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchBtn.click();
  }
});

// 엑셀 다운로드
excelDownloadBtn.addEventListener('click', async () => {
  try {
    // CSV 형식으로 변환
    let csvContent = "구분,기수,이름,금액,납부일,비고\n";
    
    allPayments.forEach(payment => {
      csvContent += [
        payment.memberType,
        payment.generation,
        payment.name,
        payment.amount,
        formatDate(payment.paymentDate),
        payment.note || ''
      ].join(",") + "\n";
    });
    
    // 엑셀 파일 다운로드
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const filename = `교우회비_현황_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error("엑셀 다운로드 에러:", error);
    alert("엑셀 다운로드 중 오류가 발생했습니다.");
  }
});

// 납부 데이터 로드
async function loadPayments() {
  paymentsSpinner.style.display = 'block';
  
  try {
    const paymentsQuery = query(collection(db, "payments"));
    const querySnapshot = await getDocs(paymentsQuery);
    
    allPayments = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allPayments.push({
        id: doc.id,
        ...data,
        paymentDate: data.paymentDate?.toDate?.() || new Date(data.paymentDate)
      });
    });
    
    // 정렬 및 표시
    displayPayments(allPayments);
    
    // 요약 정보 업데이트
    updateSummary(allPayments);
  } catch (error) {
    console.error("데이터 로드 에러:", error);
    alert("데이터 로드 중 오류가 발생했습니다.");
  } finally {
    paymentsSpinner.style.display = 'none';
  }
}

// 데이터 정렬 및 표시
function displayPayments(payments) {
  const paymentsList = document.getElementById('payments-list');
  paymentsList.innerHTML = '';
  
// 정렬
  const sortedPayments = [...payments].sort((a, b) => {
    const field = currentSort.field;
    const order = currentSort.order === 'asc' ? 1 : -1;
    
    // 회원 타입 특별 정렬
    if (field === 'memberType') {
      const typeOrder = { '평생회원': 1, '후원금': 2, '졸업생': 3, '재학생': 4 };
      return (typeOrder[a.memberType] - typeOrder[b.memberType]) * order;
    }
    
    // 일반 필드 정렬
    if (a[field] < b[field]) return -1 * order;
    if (a[field] > b[field]) return 1 * order;
    return 0;
  });
  
  // 모바일 여부 확인
  const isMobile = window.innerWidth <= 768;
  
  // 목록에 추가
  sortedPayments.forEach(payment => {
    const row = document.createElement('tr');
    
    // 모바일 최적화된 행 생성
    if (isMobile) {
      row.innerHTML = `
        <td>${payment.memberType}</td>
        <td>${payment.generation}기</td>
        <td>${payment.name}</td>
        <td>${payment.amount.toLocaleString()}원</td>
        <td class="action-buttons">
          <button class="edit-btn" data-id="${payment.id}">수정</button>
          <button class="delete-btn" data-id="${payment.id}">삭제</button>
        </td>
      `;
    } else {
      row.innerHTML = `
        <td>${payment.memberType}</td>
        <td>${payment.generation}기</td>
        <td>${payment.name}</td>
        <td>${payment.amount.toLocaleString()}원</td>
        <td class="optional-column">${formatDate(payment.paymentDate)}</td>
        <td class="optional-column">${payment.note || '-'}</td>
        <td class="action-buttons">
          <button class="edit-btn" data-id="${payment.id}">수정</button>
          <button class="delete-btn" data-id="${payment.id}">삭제</button>
        </td>
      `;
    }
    
    paymentsList.appendChild(row);
  });
  
  // 수정 버튼 이벤트 연결
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  
  // 삭제 버튼 이벤트 연결
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePayment(btn.dataset.id));
  });
}

// 요약 정보 업데이트
function updateSummary(payments) {
  const totalAmountEl = document.getElementById('total-amount');
  const totalMembersEl = document.getElementById('total-members');
  const lifetimeMembersEl = document.getElementById('lifetime-members');
  const graduateMembersEl = document.getElementById('graduate-members');
  const studentMembersEl = document.getElementById('student-members');
  
  // 총 납부액
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  totalAmountEl.textContent = `${totalAmount.toLocaleString()}원`;
  
  // 납부 인원
  totalMembersEl.textContent = `${payments.length}명`;
  
  // 평생회원 수
  const lifetimeMembers = payments.filter(p => p.memberType === '평생회원').length;
  lifetimeMembersEl.textContent = `${lifetimeMembers}명`;
  
  // 졸업생 수
  const graduateMembers = payments.filter(p => p.memberType === '졸업생').length;
  graduateMembersEl.textContent = `${graduateMembers}명`;
  
  // 재학생 수
  const studentMembers = payments.filter(p => p.memberType === '재학생').length;
  studentMembersEl.textContent = `${studentMembers}명`;
}

// 납부 정보 수정 모달 열기
async function openEditModal(id) {
  try {
    const payment = allPayments.find(p => p.id === id);
    
    if (payment) {
      document.getElementById('payment-id').value = payment.id;
      document.getElementById('member-type').value = payment.memberType;
      document.getElementById('generation').value = payment.generation;
      document.getElementById('name').value = payment.name;
      document.getElementById('amount').value = payment.amount;
      document.getElementById('payment-date').valueAsDate = payment.paymentDate;
      document.getElementById('note').value = payment.note || '';
      
      modalTitle.textContent = '회비 납부 수정';
      document.getElementById('submit-btn').textContent = '수정하기';
      
      paymentModal.style.display = 'block';
    } else {
      alert("해당 납부 정보를 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("정보 조회 에러:", error);
    alert("정보 조회 중 오류가 발생했습니다.");
  }
}

// 납부 정보 등록/수정
paymentForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  submitSpinner.style.display = 'block';
  
  const id = document.getElementById('payment-id').value;
  const memberType = document.getElementById('member-type').value;
  const generation = parseInt(document.getElementById('generation').value);
  const name = document.getElementById('name').value;
  const amount = parseInt(document.getElementById('amount').value);
  const paymentDate = new Date(document.getElementById('payment-date').value);
  const note = document.getElementById('note').value;
  
  // 납부 정보 객체
  const paymentData = {
    memberType,
    generation,
    name,
    amount,
    paymentDate: Timestamp.fromDate(paymentDate),
    note,
    updatedAt: Timestamp.now()
  };
  
  try {
    if (id) {
      // 기존 정보 수정
      await updateDoc(doc(db, "payments", id), paymentData);
      alert('납부 정보가 수정되었습니다.');
    } else {
      // 새 정보 등록
      paymentData.createdAt = Timestamp.now();
      await addDoc(collection(db, "payments"), paymentData);
      alert('납부 정보가 등록되었습니다.');
    }
    
    // 폼 초기화 및 모달 닫기
    paymentForm.reset();
    paymentModal.style.display = 'none';
    
    // 목록 새로고침
    await loadPayments();
  } catch (error) {
    console.error("저장 에러:", error);
    alert("저장 중 오류가 발생했습니다.");
  } finally {
    submitSpinner.style.display = 'none';
  }
});

// 납부 정보 삭제
async function deletePayment(id) {
  if (confirm('정말 삭제하시겠습니까?')) {
    try {
      // Firestore 문서 삭제
      await deleteDoc(doc(db, "payments", id));
      
      // 목록 새로고침
      await loadPayments();
      
      alert('납부 정보가 삭제되었습니다.');
    } catch (error) {
      console.error("삭제 에러:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  }
}

// 날짜 포맷 함수
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 현재 날짜를 기본값으로 설정
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('payment-date').valueAsDate = new Date();
  adjustTableColumns();
});
