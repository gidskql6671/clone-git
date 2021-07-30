# git

# 문제관련
폴더 막 생기는게 싫어서 프로그램 실행한 위치에 local 디렉토리를 두고 그 안에 레포지토리들이 생기도록 했어요.
`init 레포명`하면 local안에 `레포명`이 생겨요. 그리고 그 `레포명`폴더 안에 `.git`을 만들어서 버전관리를 했어요.
checkout 후 add, update하는 동작은 아까 만든 `레포명`폴더 안에서 이루어져요.
add나 commit같은 명령어들은 `.git`안의 index파일과 objects 폴더를 건드립니다.
- 처음 구현할 땐 개념이 제대로 안잡혀서 git의 개념과는 조금 다르게 작성됐어요.
remote는 아예 다른 폴더를 만들까하다가, 번잡스러워서 해당 레포안에 `.remote`를 만들어서 그안에서 동작시켰어요.
export는 `.git`폴더의 `logs`폴더에 파일을 만들도록 했어요.
- git의 개념상으로는 `logs`폴더에 브랜치의 포인터가 어떤 명령에 의해 어떻게 바뀌었는지 기록하는 곳이에요.
- 약간 다르긴 하지만, 비스무리한 역할같아서 `logs`에 넣었어요

## local.js vs localVer2.js
local.js는 문제의 조건대로 구현한 것, localVer2.js는 좀더 git에 가깝게 구현한 것.
파일 내용으로부터 Object ID를 가져오고, 그걸로 실제 Object객체를 만들었다.

# VCS 버전 관리 시스템
소스코드를 관리하는 시스템은 크게 3종류이다.
- VCS 로컬 방식 : RCS, SCCS
- CVCS 중앙 서버 방식 : Subversion(SVN), Perforce, ...
- DVCS 분산 저장소 방식 : Git, ...

## LVCS (로컬 버전 관리 시스템)
Local VCS는 간단한 DB를 사용하여 파일의 변경 정보를 관리한다. 해당하는 기술로는 RCS가 있으며, RCS는 기본적으로 Patch Set(파일에서 변경되는 부분)을 관리한다.

## CVCS (중앙 서버 관리 방식)
Centralized VCS는 다른 개발자와 협업할때 사용되는 시스템이다. 
파일을 관리하는 서버가 별도로 있고 클라이언트가 중앙 서버에서 파일(스냅샷)을 받아(Checkout) 사용할 수 있다.

장점으로는 관리자가 프로젝트에 참여한 사람 중 누가 무엇을 하는지 관리하기 쉽다.
그러나 중앙서버에 문제가 발생해 다운될 경우, 그동안은 협업 및 백업이 불가능하다. 또한 하드디스크에 문제가 생긴다면 프로젝트의 모든 히스토리를 잃을 수 있다.
Subversion, Perforce가 이에 해당한다.

## DVCS (분산 버전 관리 시스템)
Distributed VCS는 클라이언트가 파일의 마지막 스냅샷을 가져오는 것이 아니라 저장소 자체를 복제한다.
그렇기에 서버에 문제가 생겨도 복제물로 작업이 가능하며 서버를 복원할 수도 있다. 
또한 리모트 저장소가 존재하여 다수의 리모트 저장소를 가질 수 있다. 즉, 동시에 다양한 그룹과 다양한 방법으로 협업이 가능하다는 뜻이다.
해당하는 기술로는 Git이 있다.

## 개념
### remote
원격 저장소를 의미한다. 여러 사람과의 협업을 위해 로컬 레포와 원격 레포를 동기화할 수 있다. 원격 저장소를 여러개 등록할 수도 있다.

### local
내 컴퓨터에서 관리되는 레포를 의미한다. add나 commit과 같은 버전 관리 명령어들은 레포에 영향을 준다. push나 pull, fetch 등으로 원격과 로컬 레포를 동기화할 수 있다.

### init
Git 저장소를 새로 만들어준다. 

### clone
이미 만들어져있는 원격 레포지토리를 복제해온다. 해당 레포지토리의 커밋 이력과 같은 정보들을 그대로 들고 온다.

## git 상태 관리
### Repository
실제 파일들을 버전별로 저장해두는 곳.
커밋을 하면 새로운 버전이 생겨 Repo에 저장된다.
내 PC에 저장되는 **Local Repository**와 원격으로 저장되는 **Remote Repository**가 있다. git을 통해 commit하는 버전은 local에 적용되고, push나 pull같은 명령어로 local과 remote를 동기화할 수 있다.

### Staging Area(Index)
Working Directory에서 Repository로 정보가 저장되기 전 준비 영역.
파일 상태를 기록, 스테이징한다고도 표현한다.
- .git/index 파일로 관리된다.
- `git diff --cached` 명령어로 index와 repo 영역을 비교할 수 있다.

### Working Directory
실제 프로젝트 디렉토리, .git 폴더를 제외한 모든 영역.
해당 영역에서 실제 코드를 수정하고 추가하는 변경이 이루어 진다.
Working Directory에서 코드를 수정해도 index와 repository에는 반영이 안되며, 명령어를 통해 동기화 시켜야 한다.
- `git diff` 명령어로 working dir와 repo 영역을 비교할 수 있다.
- `git diff --staged` 명령어로 working dir와 index를 비교할 수 있다.

### Stash
Working Directroy, Index, Repository와는 다른 별개의 임시 영역이다. 임시로 작업사항을 저장하고 나중에 다시 꺼내올 수 있다.

## 파일 상태
Working Directory의 파일들에게 부여되는 상태
- Untracked
    - 크게 Untracked와 Tracked로 나누어지며, 아래 3개의 상태는 모두 Tracked 상태이다.
    - 파일을 새로 만들거나 ignore한 파일들이 Untracked상태가 된다.
    - `git add`로 Staged 상태로 만들 수 있다.
- Unmodified
    - Index에 있는 파일과 현재 파일 내용이 동일한 경우, Unmodified 상태가 된다.
- Modified
    - Index에 있는 파일과 현재 파일 내용이 다른 경우, Modified 상태가 된다.
    - `git add`로 Staged 상태로 만들 수 있다.
- Staged
    - 파일이 Index에 올라가있는 상태이다.
    - `git commit`을 하면 Index와 Repository가 동기화되며, 새로운 버전이 만들어진다.