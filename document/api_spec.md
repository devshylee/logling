# Logling API 명세서 (API Specification)

Logling 서비스에서 사용하는 주요 백엔드 API 목록과 요청/응답 규격입니다. 모든 API는 기본적으로 **JSON** 형식을 사용합니다.

---

## 🔐 공통 사항 (Common)
- **Base URL**: `http://localhost:3000/api` (로컬 개발 서버 기준)
- **Authentication**: `next-auth` 세션 기반 인증. 모든 API 요청 시 세션 쿠키가 포함되어야 합니다.
- **Error Format**:
  ```json
  { "error": "에러 메시지 내용" }
  ```

---

## 1. 저장소 (Repositories)

### 📂 GET /repositories
사용자의 GitHub 저장소 목록을 조회합니다.

- **Request**: (None)
- **Response (200 OK)**:
  ```json
  {
    "repos": [
      {
        "id": 1189203510,
        "full_name": "owner/repo-name",
        "description": "저장소 설명",
        "stargazers_count": 10,
        "forks_count": 5,
        "language": "TypeScript",
        "updated_at": "2024-03-24T00:00:00Z"
      }
    ]
  }
  ```

---

## 2. 분석 (Analysis)

### ⚔️ POST /analyze
특정 커밋에 대해 AI 분석(퀘스트)을 요청합니다.

- **Request Body**:
  ```json
  {
    "repoFullName": "owner/repo-name",
    "commitSha": "hash-value-123",
    "commitMessage": "커밋 메시지 원본",
    "repositoryId": "db-repo-uuid (Optional)"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "분석 큐에 등록되었습니다.",
    "analysisId": "newly-created-analysis-uuid"
  }
  ```
- **Response (400 Bad Request)**: 필수 필드 (`repoFullName`, `commitSha`) 누락 시 발생

---

## 3. 블로그 생성 (Blog Generation)

### ✍️ POST /blog
이미 완료된 분석 결과를 바탕으로 기술 블로그 마크다운 초안을 생성합니다.

- **Request Body**:
  ```json
  {
    "analysisId": "completed-analysis-uuid"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "markdown": "# 블로그 제목\n\n내용..."
  }
  ```
- **Response (404 Not Found)**: 분석 정보가 없거나 아직 완료되지 않은 경우

---

## 4. 사용자 프로필 (User Profile)

### 👤 Supabase Direct / RPC
로그인한 유저의 프로필 및 기술 스택 정보를 조회합니다. (클라이언트에서 Supabase SDK 직접 사용)

- **Table**: `user_profiles`
  - Select Filtering: `id = user_id`
- **Table**: `tech_skills`
  - Select Filtering: `user_id = user_id`

---

## 🛠️ 상태 코드 요약 (HTTP Status Codes)

| 코드 | 의미 | 설명 |
| :--- | :--- | :--- |
| **200** | Success | 요청이 정상적으로 처리됨 |
| **201** | Created | 새로운 자원(분석 내역 등)이 생성됨 |
| **401** | Unauthorized | 유효한 세션이 없거나 로그인이 필요함 |
| **403** | Forbidden | 요청 권한이 없거나 GitHub 토큰 만료 |
| **404** | Not Found | 요청한 리소스(저장소, 분석 결과 등)를 찾을 수 없음 |
| **500** | Internal Server Error | 서버 내부 오류 또는 AI API 통신 실패 |
