const WORKER_BASE_URL = 'https://inlefel.sjo579235.workers.dev';

// 모든 소행성 카드에 사용할 대표 이미지
const UNIFIED_ASTEROID_IMAGE =
    "https://images-assets.nasa.gov/image/PIA00136/PIA00136~orig.jpg";

let rawAsteroidData = [];
let currentAnimationFrameId = null;


// ========================================
// HTML 설명을 일반 텍스트로 정리하는 함수
// ========================================
function cleanHTMLText(html) {
    if (!html) return "";

    const doc = new DOMParser().parseFromString(html, "text/html");

    // 불필요한 요소 제거
    doc.querySelectorAll("script, style").forEach(element => {
        element.remove();
    });

    // 링크는 주소가 아니라 화면에 표시되는 텍스트만 남김
    doc.querySelectorAll("a").forEach(link => {
        const text = doc.createTextNode(link.textContent || "");
        link.replaceWith(text);
    });

    // 줄바꿈 태그 정리
    doc.querySelectorAll("br").forEach(element => {
        element.replaceWith(" ");
    });

    // HTML 태그 제거 후 텍스트 추출
    let text = doc.body.textContent || "";

    // 설명 레이블 제거
    text = text.replace(/^\s*설명\s*:\s*/i, "");

    // 불필요한 공백 정리
    text = text.replace(/\s+/g, " ").trim();

    return text;
}


// ========================================
// 한국어 번역 함수
// ========================================
async function translateToKorean(text) {
    if (!text) return "";

    // HTML이 포함된 경우 먼저 정리
    const cleanText = cleanHTMLText(text);

    if (!cleanText) return "";

    try {
        const url =
            `https://translate.googleapis.com/translate_a/single` +
            `?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(cleanText)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`번역 요청 실패: ${response.status}`);
        }

        const data = await response.json();

        return data[0]
            .map(item => item[0])
            .filter(Boolean)
            .join("");

    } catch (error) {
        console.error("번역 실패:", error);

        // 번역 실패 시 HTML이 아닌 정리된 원문 반환
        return cleanText;
    }
}


// ========================================
// 1. 오늘의 천문사진 (APOD)
// ========================================
async function getAPOD() {
    const apodLoading = document.getElementById('apod-loading');
    const apodContainer = document.getElementById('apod-container');
    const apodMedia = document.getElementById('apod-media');
    const apodTitle = document.getElementById('apod-title');
    const apodDate = document.getElementById('apod-date');
    const apodExplanation = document.getElementById('apod-explanation');

    const url = `${WORKER_BASE_URL}/apod`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`APOD Error: ${response.status}`);
        }

        const data = await response.json();

        // NASA APOD 원문 확인용 로그
        console.log("NASA APOD 원문:", data.explanation);

        // 이미지 표시
        if (data.media_type === "image") {
            const imageUrl = data.hdurl || data.url;

            apodMedia.innerHTML = `
            <a
                href="${data.permalink || "https://apod.nasa.gov/apod/astropix.html"}"
                target="_blank"
                rel="noopener noreferrer"
            >
                <img
                    src="${imageUrl}"
                    alt="${data.alt || data.title || "오늘의 천문사진"}"
                    loading="eager"
                    style="cursor: pointer;"
                >
            </a>
        `;

            const image = apodMedia.querySelector("img");

            image.onerror = () => {
                apodMedia.innerHTML = `
                    <p>천문사진 이미지를 불러오지 못했습니다.</p>
                    <a
                        href="${data.permalink || "https://apod.nasa.gov/apod/astropix.html"}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        NASA 천문사진 페이지에서 확인하기
                    </a>
                `;
            };
        }

        // 날짜 표시
        apodDate.textContent = `촬영 일자: ${data.date}`;

        // 번역 중 표시
        apodTitle.textContent = '번역 중...';
        apodExplanation.textContent = '설명을 한국어로 번역하고 있습니다...';

        // 제목과 설명의 HTML 정리
        const cleanTitle = cleanHTMLText(data.title);
        const cleanExplanation = cleanHTMLText(data.explanation);

        // 정리된 설명 확인용 로그
        console.log("정리된 설명:", cleanExplanation);

        // 제목과 설명 번역
        const [translatedTitle, translatedExplanation] = await Promise.all([
            translateToKorean(cleanTitle),
            translateToKorean(cleanExplanation)
        ]);

        // 번역 결과 표시
        apodTitle.textContent = translatedTitle;
        apodExplanation.textContent = translatedExplanation;

        // 로딩 숨기기 및 APOD 표시
        if (apodLoading) {
            apodLoading.style.display = 'none';
        }

        if (apodContainer) {
            apodContainer.style.display = 'block';
        }

    } catch (error) {
        console.error('천문사진 불러오기 실패:', error);

        if (apodLoading) {
            apodLoading.textContent =
                '천문사진을 불러오는 데 실패했습니다.';
        }
    }
}


// ========================================
// 2. 근지구 소행성 (NEO)
// ========================================
async function getNEO() {
    const neoLoading = document.getElementById('neo-loading');

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const today = `${year}-${month}-${day}`;

    const url = `${WORKER_BASE_URL}/neo?date=${today}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`NEO Error: ${response.status}`);
        }

        const data = await response.json();

        if (
            !data.near_earth_objects ||
            !data.near_earth_objects[today]
        ) {
            if (neoLoading) {
                neoLoading.textContent =
                    '오늘의 소행성 데이터가 존재하지 않습니다.';
            }

            return;
        }

        rawAsteroidData = data.near_earth_objects[today];

        setupSortEvent();

        renderAndAnimate('distance-desc');

        if (neoLoading) {
            neoLoading.style.display = 'none';
        }

    } catch (error) {
        console.error('소행성 불러오기 실패:', error);

        if (neoLoading) {
            neoLoading.textContent =
                '소행성 데이터를 불러오는 데 실패했습니다.';
        }
    }
}


// ========================================
// 3. 정렬 이벤트 처리
// ========================================
function setupSortEvent() {
    const sortSelect = document.getElementById('sort-select');

    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
        renderAndAnimate(e.target.value);
    });
}


// ========================================
// 4. 데이터 정렬 함수
// ========================================
function sortAsteroids(asteroids, sortBy) {
    return [...asteroids].sort((a, b) => {
        const approachA = a.close_approach_data[0];
        const approachB = b.close_approach_data[0];

        const distA = approachA
            ? parseFloat(approachA.miss_distance.kilometers)
            : 0;

        const distB = approachB
            ? parseFloat(approachB.miss_distance.kilometers)
            : 0;

        const sizeA =
            a.estimated_diameter.meters.estimated_diameter_max;

        const sizeB =
            b.estimated_diameter.meters.estimated_diameter_max;

        const speedA = approachA
            ? parseFloat(
                approachA.relative_velocity.kilometers_per_hour
            )
            : 0;

        const speedB = approachB
            ? parseFloat(
                approachB.relative_velocity.kilometers_per_hour
            )
            : 0;

        // 위험 여부
        const hazardA =
            a.is_potentially_hazardous_asteroid ? 1 : 0;

        const hazardB =
            b.is_potentially_hazardous_asteroid ? 1 : 0;

        switch (sortBy) {
            case 'hazard-desc':

                // 위험한 소행성을 먼저 표시
                // 위험 여부가 같으면 가까운 순서
                if (hazardB !== hazardA) {
                    return hazardB - hazardA;
                }

                return distA - distB;

            case 'distance-asc':
                return distA - distB;

            case 'distance-desc':
                return distB - distA;

            case 'size-desc':
                return sizeB - sizeA;

            case 'size-asc':
                return sizeA - sizeB;

            case 'speed-desc':
                return speedB - speedA;

            case 'speed-asc':
                return speedA - speedB;

            default:
                return distB - distA;
        }
    });
}


// ========================================
// 5. 렌더링 및 애니메이션 준비
// ========================================
function renderAndAnimate(sortBy) {
    const listElement = document.getElementById('neo-list');

    if (!listElement) return;

    listElement.innerHTML = '';

    const sorted = sortAsteroids(rawAsteroidData, sortBy);

    sorted.forEach((asteroid, index) => {
        const isHazardous =
            asteroid.is_potentially_hazardous_asteroid;

        const name = asteroid.name;

        const size = Math.round(
            asteroid.estimated_diameter.meters.estimated_diameter_max
        );

        const approachData = asteroid.close_approach_data[0];

        const speed = approachData
            ? Math.round(
                approachData.relative_velocity.kilometers_per_hour
            )
            : 0;

        const distance = approachData
            ? Math.round(
                approachData.miss_distance.kilometers
            )
            : 0;

        const detailUrl =
            asteroid.nasa_jpl_url || "https://ssd.jpl.nasa.gov/";

        const li = document.createElement('li');

        li.className = 'asteroid-card';

        li.style.padding = '24px';
        li.style.marginBottom = '20px';
        li.style.borderRadius = '12px';
        li.style.backgroundColor = '#21262d';

        li.style.borderLeft = isHazardous
            ? '8px solid #ff4d4d'
            : '8px solid #4caf50';

        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '24px';

        // 목표 수치를 데이터 속성으로 저장
        li.dataset.targetDistance = distance;
        li.dataset.targetSize = size;
        li.dataset.targetSpeed = speed;

        li.innerHTML = `
            <a
                href="${detailUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="flex-shrink: 0;"
            >
                <img
                    src="${UNIFIED_ASTEROID_IMAGE}"
                    alt="소행성"
                    style="
                        width: 100px;
                        height: 100px;
                        object-fit: cover;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    "
                    onmouseover="this.style.transform='scale(1.05)'"
                    onmouseout="this.style.transform='scale(1)'"
                >
            </a>

            <div style="flex-grow: 1;">
                <div
                    style="
                        font-weight: bold;
                        font-size: 1.4rem;
                        color: #ffffff;
                        margin-bottom: 8px;
                    "
                >
                    <a
                        href="${detailUrl}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                            color: #ffffff;
                            text-decoration: none;
                        "
                    >
                        ${name}
                    </a>

                    ${
                        isHazardous
                            ? '<span style="color: #ff4d4d;">(위험)</span>'
                            : '<span style="color: #4caf50;">(안전)</span>'
                    }
                </div>

                <div
                    style="
                        color: #a3b1c2;
                        font-size: 1.1rem;
                        line-height: 1.7;
                    "
                >
                    추정 크기: 약
                    <strong style="color: #8ff8ffff;">
                        <span class="num-size">0</span>m
                    </strong>
                    <br>

                    접근 거리: 지구에서 약
                    <strong
                        style="
                            color: #ffeeffff;
                            font-size: 1.25rem;
                        "
                    >
                        <span class="num-dist">0</span> km
                    </strong>
                    <br>

                    이동 속도: 약
                    <strong style="color: #ffbd5bff;">
                        <span class="num-speed">0</span> km/h
                    </strong>
                </div>
            </div>
        `;

        listElement.appendChild(li);
    });

    // 카드 생성 후 스크롤 감지기 등록
    setupScrollObserver();
}


// ========================================
// 6. 스크롤 감지 및 카드 애니메이션
// ========================================
function setupScrollObserver() {
    const cards = document.querySelectorAll('.asteroid-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const card = entry.target;

            if (entry.isIntersecting) {

                // 화면에 보이면 카드 등장
                card.classList.add('show');

                // 숫자 카운트업 시작
                animateCardNumbers(card);

            } else {

                // 화면 밖으로 나가면 초기화
                card.classList.remove('show');

                resetCardNumbers(card);
            }
        });
    }, {
        threshold: 0.2
    });

    cards.forEach(card => {
        observer.observe(card);
    });
}


// ========================================
// 7. 숫자 애니메이션 초기화
// ========================================
function resetCardNumbers(card) {
    if (card.animationFrame) {
        cancelAnimationFrame(card.animationFrame);
    }

    const distEl = card.querySelector('.num-dist');
    const sizeEl = card.querySelector('.num-size');
    const speedEl = card.querySelector('.num-speed');

    if (distEl) {
        distEl.textContent = '0';
    }

    if (sizeEl) {
        sizeEl.textContent = '0';
    }

    if (speedEl) {
        speedEl.textContent = '0';
    }
}


// ========================================
// 8. 숫자 카운트업 애니메이션
// ========================================
function animateCardNumbers(card) {
    // 기존 애니메이션 취소
    if (card.animationFrame) {
        cancelAnimationFrame(card.animationFrame);
    }

    const distEl = card.querySelector('.num-dist');
    const sizeEl = card.querySelector('.num-size');
    const speedEl = card.querySelector('.num-speed');

    const targetDist =
        parseFloat(card.dataset.targetDistance) || 0;

    const targetSize =
        parseFloat(card.dataset.targetSize) || 0;

    const targetSpeed =
        parseFloat(card.dataset.targetSpeed) || 0;

    let currDist = 0;
    let currSize = 0;
    let currSpeed = 0;

    // 숫자가 올라가는 속도
    const easeFactor = 0.07;

    function step() {
        let isFinished = true;

        // 1. 거리
        const distDiff = targetDist - currDist;

        if (distDiff > 0.5) {
            currDist += Math.max(
                distDiff * easeFactor,
                0.5
            );

            if (currDist > targetDist) {
                currDist = targetDist;
            }

            isFinished = false;
        } else {
            currDist = targetDist;
        }

        if (distEl) {
            distEl.textContent =
                Math.round(currDist).toLocaleString();
        }


        // 2. 크기
        const sizeDiff = targetSize - currSize;

        if (sizeDiff > 0.5) {
            currSize += Math.max(
                sizeDiff * easeFactor,
                0.2
            );

            if (currSize > targetSize) {
                currSize = targetSize;
            }

            isFinished = false;
        } else {
            currSize = targetSize;
        }

        if (sizeEl) {
            sizeEl.textContent =
                Math.round(currSize).toLocaleString();
        }


        // 3. 속도
        const speedDiff = targetSpeed - currSpeed;

        if (speedDiff > 0.5) {
            currSpeed += Math.max(
                speedDiff * easeFactor,
                0.5
            );

            if (currSpeed > targetSpeed) {
                currSpeed = targetSpeed;
            }

            isFinished = false;
        } else {
            currSpeed = targetSpeed;
        }

        if (speedEl) {
            speedEl.textContent =
                Math.round(currSpeed).toLocaleString();
        }


        // 애니메이션이 끝나지 않았으면 다음 프레임 실행
        if (!isFinished) {
            card.animationFrame =
                requestAnimationFrame(step);
        }
    }

    card.animationFrame =
        requestAnimationFrame(step);
}


// ========================================
// 앱 실행
// ========================================
getAPOD();
getNEO();
