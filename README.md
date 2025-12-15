# NadaFlix

NadaFlix는 React 19, TypeScript, Vite 7로 구현한 넷플릭스 스타일 Single Page Application(SPA) 데모입니다. 실제 TMDb REST API를 호출해 영화 데이터를 불러오며, 인증과 위시리스트 상태는 전부 LocalStorage로 관리해 백엔드 없이 동작합니다. 학습 및 데모 목적 프로젝트입니다.


## 주요 특징

- 인기/현재 상영/최고 평점/개봉 예정/검색/Discover/상세 등 TMDb 실데이터 연동
- React Router 기반의 LocalStorage 인증, Protected Route, Nested Layout 구성
- TMDb 호출 없이 LocalStorage만으로 동작하는 위시리스트 (Storage Event로 멀티 탭 동기화)
- 앱 시작 시 즉시 적용되는 다크/라이트 테마로 FOUC 최소화
- 네온 핑크·오렌지 감성 UI, 글래스모피즘 헤더, 카드 호버 애니메이션, 독립 인증 화면 스타일
- Home / Popular / Search / Detail / Wishlist / Profile까지 SPA 친화적 라우팅

## 기술 스택

| 영역      | 기술                                             |
|-----------|--------------------------------------------------|
| Framework | React 19                                         |
| Language  | TypeScript                                       |
| Build     | Vite 7                                           |
| Routing   | React Router                                     |
| Styling   | Custom CSS (네온 테마)                           |
| State     | React Context + LocalStorage                     |
| API       | TMDb REST API (v3 Key / v4 Bearer Token 지원)    |
| Lint      | ESLint (Flat Config)                             |

## 프로젝트 구조

```
src/
├─ components/
│  ├─ AppLayout.tsx
│  ├─ ProtectedRoute.tsx
│  ├─ MovieCard.tsx
│  └─ MovieSection.tsx
├─ pages/
│  ├─ SignInPage.tsx
│  ├─ HomePage.tsx
│  ├─ PopularPage.tsx
│  ├─ SearchPage.tsx
│  ├─ MovieDetailPage.tsx
│  ├─ WishlistPage.tsx
│  └─ ProfilePage.tsx
├─ hooks/
│  ├─ useMovies.ts
│  └─ useWishlist.ts
├─ utils/
│  ├─ auth.ts
│  └─ theme.ts
├─ context/
│  └─ AuthContext.tsx
├─ App.tsx
├─ main.tsx
└─ index.css
```

## 라우팅

| Path         | 설명                          | 가드        |
|--------------|-------------------------------|-------------|
| `/signin`    | 로그인 / 회원가입             | 공개        |
| `/`          | 홈                            | 보호        |
| `/popular`   | 인기 콘텐츠                   | 보호        |
| `/search`    | 검색 및 필터                  | 보호        |
| `/movie/:id` | 영화 상세                     | 보호        |
| `/wishlist`  | 위시리스트(LocalStorage 전용) | 보호        |
| `/profile`   | 프로필 / 설정                 | 보호        |

모든 보호 라우트는 `ProtectedRoute`와 `AppLayout` 내부에서 렌더링되며, 잘못된 주소는 `/`로 리디렉션됩니다.

## LocalStorage 키

| 키             | 설명                                  |
|----------------|---------------------------------------|
| `TMDb-Key`     | TMDb v3 API Key 또는 v4 Bearer Token  |
| `isLogin`      | 로그인 여부                           |
| `rememberId`   | 로그인 이메일 Remember-Me             |
| `users`        | 로컬 사용자 목록                      |
| `movieWishlist`| 찜한 영화 리스트                      |
| `theme`        | `dark` 또는 `light` 테마 값           |

### 인증 흐름

1. 이메일 + TMDb API Key(또는 토큰)를 입력해 로그인합니다.
2. 성공 시 `TMDb-Key`, `isLogin`을 저장하고 `AuthContext`를 통해 전역 인증 상태를 제공합니다.
3. `/signin`을 제외한 모든 라우트는 `ProtectedRoute`로 접근 제어합니다.
4. API Key를 바꾸려면 반드시 로그아웃하여 LocalStorage를 초기화해야 합니다.

## TMDb API 사용

- `/movie/popular`, `/movie/now_playing`, `/movie/top_rated`, `/movie/upcoming`, `/search/movie`, `/discover/movie`, `/movie/{id}` 엔드포인트 사용
- 모든 요청에 `language=ko-KR` 파라미터 적용
- TMDb v3 Key(Query Param)와 v4 Bearer Token(Authorization Header) 모두 지원

## 위시리스트 & 테마

- 별(⭐) 버튼 토글만으로 `movieWishlist` 값을 추가/삭제하며, Storage Event를 통해 다른 탭과 실시간 동기화합니다.
- `main.tsx` 초기 실행 시 LocalStorage의 `theme` 값을 즉시 적용해 `body.theme-dark` 또는 `body.theme-light` 클래스를 부여, FOUC를 최소화합니다.

## UI 메모

- 네온 핑크/오렌지 그라데이션과 글래스모피즘 헤더
- 카드 호버 트랜지션, 커스텀 인증 화면 애니메이션
- 모바일 반응형 미디어쿼리 적용

## 시작하기

1. 의존성 설치

   ```sh
   npm install
   ```

2. 개발 서버 실행 (http://localhost:5173)

   ```sh
   npm run dev
   ```

3. 프로덕션 빌드

   ```sh
   npm run build
   ```

4. 빌드 미리보기

   ```sh
   npm run preview
   ```

## TMDb API 키 발급 및 등록

1. https://www.themoviedb.org 에 접속 후 회원가입/로그인합니다.
2. Settings → API에서 v3 Key 또는 v4 Bearer Token을 발급합니다.
3. NadaFlix 로그인 화면의 비밀번호 칸에 발급받은 키를 입력합니다.
4. 다른 키로 교체하려면 로그아웃 후 다시 로그인해야 합니다.

## 배포

`npm run build` 결과물이 `dist/`에 생성되며 Netlify, GitHub Pages, Cloudflare Pages 등 정적 호스팅에 바로 배포할 수 있습니다.
현재 배포는 Netlify를 활용하였습니다.
