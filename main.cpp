#include "include/car.h"
#include "include/raylib.h"
#include "include/raymath.h"
#include <algorithm>
#include <cstdio>

float maxThrottle = 20;
int gear = 1;
void processInput(Car &car) {
  // Gear shift
  if (IsKeyPressed(KEY_D)) {
    if (gear < 4) {
      gear += 1;
    }
  }

  if (IsKeyPressed(KEY_A)) {
    if (gear > 1) {
      gear -= 1;
    }
  }

  switch (gear) {
  case 1:
    maxThrottle = 100;
    break;
  case 2:
    maxThrottle = 500;
    break;
  case 3:
    maxThrottle = 1000;
    break;
  case 4:
    maxThrottle = 2000;
    break;
  }

  // Throttle up
  if (IsKeyDown(KEY_W)) {
    car.addThrottle(20);
    if (car.getThrottle() > maxThrottle) {
      car.setThrottle(maxThrottle);
    }
  } else {
    car.addThrottle(-5);
    if (car.getThrottle() < 0) {
      car.setThrottle(0);
    }
  }

  // Throttle down
  if (IsKeyDown(KEY_S)) {
    car.addThrottle(-20);
    if (car.getThrottle() < 0) {
      car.setThrottle(0);
    }
  }

  // Brake
  if (IsKeyDown(KEY_SPACE)) {
    car.setBrake(1000);
    car.setThrottle(0);
  } else {
    car.setBrake(0);
  }

  // Steer left
  float mouseSteer =
      -2 * (GetMousePosition().x - GetScreenWidth() / 2.0f) / GetScreenWidth();
  car.setSteerAngle(30 * DEG2RAD * mouseSteer);
}

int main() {
  SetConfigFlags(FLAG_WINDOW_RESIZABLE);
  InitWindow(800, 600, "Car Game");

  Camera3D camera = {0};
  camera.target = (Vector3){0, 0, 0};
  camera.up = (Vector3){0, 1, 0};
  camera.fovy = 45;
  camera.projection = CAMERA_PERSPECTIVE;

  Car car;

  float cameraAngle = car.getAngle();
  float cameraDistance = 20;

  while (!WindowShouldClose()) {
    float dt = GetFrameTime();

    UpdateCamera(&camera, CAMERA_THIRD_PERSON);
    processInput(car);
    car.update(dt);

    cameraAngle = Lerp(cameraAngle, car.getAngle(), dt * 5);
    cameraDistance =
        Lerp(cameraDistance, Vector2Length(car.getVelocityWC()) / 40 + 20, dt);
    float cameraOffsetY = cos(cameraAngle) * cameraDistance;
    float cameraOffsetX = sin(cameraAngle) * cameraDistance;
    camera.position =
        (Vector3){car.getPositionWC().x - cameraOffsetX, cameraDistance,
                  car.getPositionWC().y - cameraOffsetY};
    camera.target = (Vector3){car.getPositionWC().x, 0, car.getPositionWC().y};

    BeginDrawing();

    ClearBackground(RAYWHITE);

    BeginMode3D(camera);

    // DrawCube((Vector3){0, 10, 0}, 10, 10, 10, GREEN);
    car.draw();

    DrawGrid(1000, 5);

    EndMode3D();

    float steerIndicatorX = 0;
    float steerIndicatorWidth = 0;
    if (GetMousePosition().x < GetScreenWidth() / 2.0f) {
      steerIndicatorX = GetMousePosition().x;
      steerIndicatorWidth = GetScreenWidth() / 2.0f - GetMousePosition().x;
    } else {
      steerIndicatorX = GetScreenWidth() / 2.0f;
      steerIndicatorWidth = GetMousePosition().x - GetScreenWidth() / 2.0f;
    }

    char steerAngleStr[14];
    snprintf(steerAngleStr, sizeof(steerAngleStr), "%.2f deg",
             car.getSteerAngle() * RAD2DEG);
    DrawText(steerAngleStr, GetScreenWidth() / 2 - 20, GetScreenHeight() - 60,
             20, BLACK);
    DrawRectangle(steerIndicatorX, GetScreenHeight() - 40, steerIndicatorWidth,
                  20, GREEN);

    DrawFPS(10, 10);

    char speedStr[14];
    snprintf(speedStr, sizeof(speedStr), "%.2f m/s",
             Vector2Length(car.getVelocityWC()));
    DrawText(speedStr, 10, 40, 20, BLACK);

    EndDrawing();
  }

  CloseWindow();

  return 0;
}