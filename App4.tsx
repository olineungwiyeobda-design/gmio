// components/ClassDetail.tsx
import { useEffect, useState } from 'react';
import { classAPI, pointAPI, tokenManager, Student } from '../lib/api';

export function ClassDetail({ classId, onBack }: { classId: string; onBack: () => void }) {
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    const token = tokenManager.get();
    if (!token) return;

    try {
      const data = await classAPI.getById(token, classId);
      setClassData(data);
    } catch (err) {
      console.error('Failed to load class data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-10">로딩 중...</div>;
  if (!classData) return <div className="text-center p-10">학급을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:underline mb-4"
        >
          ← 학급 목록으로
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold">{classData.name}</h2>
            <p className="text-gray-600">{classData.grade}학년 {classData.class_number}반</p>
            <p className="text-sm text-blue-600 mt-1">
              접속 코드: <span className="font-mono font-bold">{classData.access_code}</span>
            </p>
          </div>
          <button
            onClick={() => setShowAddStudent(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            + 학생 추가
          </button>
        </div>
      </div>

      {/* 학생 추가 폼 */}
      {showAddStudent && (
        <AddStudentForm
          classId={classId}
          onClose={() => setShowAddStudent(false)}
          onSuccess={() => {
            setShowAddStudent(false);
            loadClassData();
          }}
        />
      )}

      {/* 학생 포인트 상세 */}
      {selectedStudent && (
        <StudentPointsDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onPointAdded={loadClassData}
        />
      )}

      {/* 학생 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">번호</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">포인트</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classData.students
              .sort((a: Student, b: Student) => a.student_number - b.student_number)
              .map((student: Student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{student.student_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-green-600 font-bold">{student.total_points || 0}점</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="text-blue-600 hover:underline mr-4"
                    >
                      상세보기
                    </button>
                    <AddPointButton student={student} onSuccess={loadClassData} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {classData.students.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            아직 학생이 없습니다. 학생을 추가해주세요!
          </div>
        )}
      </div>

      {/* 리더보드 */}
      <div className="mt-6">
        <Leaderboard classId={classId} />
      </div>
    </div>
  );
}

// ==========================================

// components/AddStudentForm.tsx
function AddStudentForm({ 
  classId, 
  onClose, 
  onSuccess 
}: { 
  classId: string; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenManager.get();
    if (!token) return;

    setLoading(true);
    try {
      await classAPI.addStudent(token, classId, name, studentNumber);
      onSuccess();
    } catch (err) {
      alert('학생 추가 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">학생 추가</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">학생 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">번호</label>
            <input
              type="number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              min="1"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              {loading ? '추가 중...' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================

// components/AddPointButton.tsx
function AddPointButton({ student, onSuccess }: { student: Student; onSuccess: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenManager.get();
    if (!token) return;

    setLoading(true);
    try {
      await pointAPI.create(token, student.id, amount, reason);
      setShowForm(false);
      setAmount(10);
      setReason('');
      onSuccess();
    } catch (err) {
      alert('포인트 지급 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-green-600 hover:underline"
      >
        포인트 주기
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">{student.name} 학생에게 포인트 주기</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">포인트</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">사유</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="예: 수업 발표 잘함"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              {loading ? '지급 중...' : '지급하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================

// components/StudentPointsDetail.tsx
function StudentPointsDetail({
  student,
  onClose,
  onPointAdded,
}: {
  student: Student;
  onClose: () => void;
  onPointAdded: () => void;
}) {
  const [pointsData, setPointsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoints();
  }, [student.id]);

  const loadPoints = async () => {
    const token = tokenManager.get();
    if (!token) return;

    try {
      const data = await pointAPI.getStudentPoints(token, student.id);
      setPointsData(data);
    } catch (err) {
      console.error('Failed to load points:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold">{student.name} 포인트 내역</h3>
            <p className="text-gray-600">총 포인트: {pointsData?.total_points || 0}점</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">로딩 중...</div>
        ) : (
          <div className="space-y-2">
            {pointsData?.transactions.map((tx: any) => (
              <div
                key={tx.id}
                className="p-4 border rounded-md flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{tx.reason}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <span
                  className={`font-bold ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}{tx.amount}점
                </span>
              </div>
            ))}

            {pointsData?.transactions.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                아직 포인트 내역이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================

// components/Leaderboard.tsx
function Leaderboard({ classId }: { classId: string }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [classId]);

  const loadLeaderboard = async () => {
    const token = tokenManager.get();
    if (!token) return;

    try {
      const data = await classAPI.getLeaderboard(token, classId);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">🏆 포인트 랭킹</h3>
      <div className="space-y-2">
        {leaderboard.slice(0, 10).map((student, index) => (
          <div
            key={student.student_id}
            className="flex items-center justify-between p-3 border rounded-md"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-400">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-gray-500">번호: {student.student_number}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-green-600">
              {student.total_points}점
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
