#pragma once

#include "raylib.h"

class Car {
private:
  float length;
  float width;
  float height;
  float mass;
  float inertia;
  float wheelLength;
  float wheelWidth;

  float b;         // Distance from CG to front axle
  float c;         // Distance from CG to rear axle
  float wheelbase; // b + c
  float h;         // Height of CM from ground

  Vector2 positionWC; // Position of car center in world coords
  Vector2 velocityWC; // Velocity vector of car in world coords

  float angle; // Angle of car body
  float angularVelocity;

  float steerAngle;
  float throttle;
  float brake;

  Model model;

public:
  Car();
  void update(float dt);
  void draw();
  void addThrottle(float deltaThrottle);
  void setThrottle(float throttle);
  void setBrake(float brake);
  void setSteerAngle(float steerAngle);

  float getThrottle() const;
  float getAngle() const;
  float getSteerAngle() const;
  Vector2 getPositionWC() const;
  Vector2 getVelocityWC() const;
};