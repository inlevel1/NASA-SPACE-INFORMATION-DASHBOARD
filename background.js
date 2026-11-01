// HTML에서 Canvas 엘리먼트를 가져옵니다.
const canvas = document.getElementById('space-bg');

// 2D 그래픽 그리기를 위한 렌더링 컨텍스트를 가져옵니다.
const ctx = canvas.getContext('2d');

// 별들의 정보를 담을 배열 변수입니다.
let stars = [];

// 화면에 생성할 별의 총 개수입니다.
const STAR_COUNT = 500;

// Canvas 크기를 브라우저 창 전체 크기에 맞추는 함수입니다.
function resizeCanvas() {

    // 캔버스 가로 크기를 창 내부 가로 크기로 설정합니다.
    canvas.width = window.innerWidth;

    // 캔버스 세로 크기를 창 내부 세로 크기로 설정합니다.
    canvas.height = window.innerHeight;

    // 창 크기가 변경될 때 별 데이터를 다시 생성합니다.
    initStars();

// resizeCanvas 함수를 종료합니다.
}

// 무작위 속성을 가진 별 개체들을 초기화하는 함수입니다.
function initStars() {

    // 별 배열을 초기화합니다.
    stars = [];

    // 설정한 개수만큼 반복하며 별을 생성합니다.
    for (let i = 0; i < STAR_COUNT; i++) {

        // 생성한 별 개체를 배열에 추가합니다.
        stars.push({

            // 별의 무작위 X 좌표를 지정합니다.
            x: Math.random() * canvas.width,

            // 별의 무작위 기본 Y 좌표를 지정합니다.
            baseY: Math.random() * canvas.height,

            // 별의 무작위 반지름(크기)을 지정합니다.
            radius: Math.random() * 1.5 + 0.5,

            // 별의 초기 투명도(알파값)를 무작위로 지정합니다.
            alpha: Math.random(),

            // 반짝이는 속도를 지정합니다.
            speed: Math.random() * 0.0075 + 0.001,

            // 밝아지거나 어두워지는 방향을 지정합니다.
            direction: Math.random() > 0.5 ? 1 : -1,

            // 스크롤 이동 시 지나는 패럴랙스 속도 깊이감을 지정합니다.
            depth: Math.random() * 0.3 + 0.001

        // 별 객체 지정을 마칩니다.
        });

    // 반복문을 종료합니다.
    }

// initStars 함수를 종료합니다.
}

// 별을 그리고 스크롤 및 반짝임 애니메이션을 실행하는 함수입니다.
function animateStars() {

    // 이전 프레임의 별 그림을 깔끔하게 지웁니다.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 현재 페이지의 세로 스크롤 위치를 구합니다.
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY;

    // 배열 내의 모든 별을 순회하며 위치와 모양을 계산합니다.
    stars.forEach(star => {

        // 별의 투명도를 시간에 따라 변경합니다.
        star.alpha += star.speed * star.direction;

        // 투명도가 한계에 도달하면 증감 방향을 반대로 바꿉니다.
        if (star.alpha >= 1 || star.alpha <= 0.2) {

            // 방향을 반전시킵니다.
            star.direction *= -1;

        // 투명도 제한 조건문을 마칩니다.
        }

        // 스크롤 위치 및 깊이에 맞춰 별의 현재 출력 Y 위치를 계산합니다.
        let renderY = (star.baseY - scrollY * star.depth) % canvas.height;

        // Y 위치가 화면 상단 밖으로 나가면 화면 하단으로 올립니다.
        if (renderY < 0) {

            // 캔버스 높이만큼 더해 위치를 루프시킵니다.
            renderY += canvas.height;

        // Y 위치 보정 조건문을 마칩니다.
        }

        // 새 도형(원) 그리기를 시작합니다.
        ctx.beginPath();

        // 원 모양의 별 좌표를 설정합니다.
        ctx.arc(star.x, renderY, star.radius, 0, Math.PI * 2);

        // 투명도가 반영된 흰색 채우기 스타일을 지정합니다.
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;

        // 별 주변의 은은한 글로우(빛남) 범위를 설정합니다.
        ctx.shadowBlur = star.radius * 2;

        // 빛나는 글로우 색상을 지정합니다.
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';

        // 설정된 조건대로 별을 화면에 채워 그립니다.
        ctx.fill();

    // 별 순회 반복문을 마칩니다.
    });

    // 다음 프레임을 재귀적으로 호출하여 끊김없는 애니메이션을 만듭니다.
    requestAnimationFrame(animateStars);

// animateStars 함수를 종료합니다.
}

// 브라우저 창 크기가 바뀌면 resizeCanvas 함수를 실행합니다.
window.addEventListener('resize', resizeCanvas);

// 최초 캔버스 크기를 초기화합니다.
resizeCanvas();

// 최초 애니메이션 루프를 시작합니다.
animateStars();