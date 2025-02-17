#include "include/car.h"
#include "include/raylib.h"
#include "include/raymath.h"
#include <cmath>
#include <iostream>

Car::Car() {
  length = 3.0;
  width = 1.5;
  height = 1.2;
  mass = 1500;
  inertia = 1500;
  wheelLength = 0.7;
  wheelWidth = 0.3;

  b = 1.0;
  c = 1.0;
  wheelbase = b + c;
  h = 1.0;

  positionWC = {
      .x = 0,
      .y = 0,
  };
  velocityWC = {
      .x = 0,
      .y = 0,
  };

  angle = 0;
  angularVelocity = 0;

  steerAngle = 0;
  throttle = 0;
  brake = 0;

  Mesh cubeMesh = GenMeshCube(width, height, length);
  model = LoadModelFromMesh(cubeMesh);
}

int signum(float x) { return (x > 0) - (x < 0); }

void Car::update(float dt) {
  const float DRAG = 5.0;        // Factor for air resistance
  const float RESISTANCE = 30.0; // Factor for rolling resistance
  const float CA_R = -5.2;       // Rear cornering stiffness
  const float CA_F = -5.0;       // Front cornering stiffness
  const float MAX_GRIP = 2.0;    // Maximum normalized friction force

  float sn = sin(angle);
  float cs = cos(angle);

  Vector2 velocity = {
      .x = cs * velocityWC.y + sn * velocityWC.x,
      .y = -sn * velocityWC.y + cs * velocityWC.x,
  };

  float yawSpeed = wheelbase * 0.5 * angularVelocity;
  float rotAngle = 0;
  float sideSlip = 0;
  float slipAngleFront = 0;
  float slipAngleRear = 0;

  if (velocity.x > 0) {
    rotAngle = atan2(yawSpeed, velocity.x);
    sideSlip = atan2(velocity.y, velocity.x);
    slipAngleFront = sideSlip + rotAngle - steerAngle;
    slipAngleRear = sideSlip - rotAngle;
  }

  float weight = mass * 9.8 * 0.5;

  Vector2 fLatFront = {
      .x = 0,
      .y = CA_F * slipAngleFront,
  };
  // fLatFront.y = min(MAX_GRIP, fLatFront.y);
  // fLatFront.y = max(-MAX_GRIP, fLatFront.y);
  fLatFront.y *= weight;

  Vector2 fLatRear = {
      .x = 0,
      .y = CA_R * slipAngleRear,
  };
  // fLatRear.y = min(MAX_GRIP, fLatRear.y);
  // fLatRear.y = max(-MAX_GRIP, fLatRear.y);
  fLatRear.y *= weight;

  Vector2 fTraction = {
      .x = 100 * (throttle - brake * signum(velocity.x)),
      .y = 0,
  };

  Vector2 resistance = {
      .x = -(RESISTANCE * velocity.x + DRAG * velocity.x * abs(velocity.x)),
      .y = -(RESISTANCE * velocity.y + DRAG * velocity.y * abs(velocity.y)),
  };

  Vector2 force = {
      .x = fTraction.x - sin(steerAngle) * fLatFront.x + fLatRear.x +
           resistance.x,
      .y = fTraction.y + cos(steerAngle) * fLatFront.y + fLatRear.y +
           resistance.y,
  };

  float torque = b * fLatFront.y - c * fLatRear.y;

  Vector2 acceleration = {
      .x = force.x / mass,
      .y = force.y / mass,
  };

  float angularAcceleration = torque / inertia;

  Vector2 accelerationWC = {
      .x = cs * acceleration.y + sn * acceleration.x,
      .y = -sn * acceleration.y + cs * acceleration.x,
  };

  velocityWC.x += dt * accelerationWC.x;
  velocityWC.y += dt * accelerationWC.y;

  positionWC.x += dt * velocityWC.x;
  positionWC.y += dt * velocityWC.y;

  angularVelocity += dt * angularAcceleration;
  angle += dt * angularVelocity;
}

void Car::draw() {
  // Mesh cubeMesh = GenMeshCube(length, height, width);
  // Model cubeModel = LoadModelFromMesh(cubeMesh);
  model.transform = MatrixTranslate(c - b, height / 2, 0);
  std::cout << positionWC.x << std::endl;
  DrawModelEx(model, (Vector3){positionWC.x, 0, positionWC.y},
              (Vector3){0, 1, 0}, angle * RAD2DEG, (Vector3){1, 1, 1}, GREEN);
  // DrawModelEx(model, (Vector3){0, 0, 0}, (Vector3){0, 1, 0}, 0,
  //             (Vector3){1, 1, 1}, GREEN);
}

void Car::addThrottle(float deltaThrottle) { this->throttle += deltaThrottle; }

void Car::setThrottle(float throttle) { this->throttle = throttle; }

void Car::setBrake(float brake) { this->brake = brake; }

void Car::setSteerAngle(float steerAngle) { this->steerAngle = steerAngle; }

float Car::getThrottle() const { return this->throttle; }

float Car::getAngle() const { return this->angle; }

float Car::getSteerAngle() const { return this->steerAngle; }

Vector2 Car::getPositionWC() const { return this->positionWC; }

Vector2 Car::getVelocityWC() const { return this->velocityWC; }