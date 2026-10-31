# Stage 1: Build the application
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app

# 1. Copy ONLY the pom.xml first
COPY pom.xml .

# 2. Download all dependencies (Docker caches this massive layer!)
RUN mvn dependency:go-offline -B

# 3. NOW copy the source code
COPY src ./src

# 4. Package the app (uses the cached dependencies instantly)
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]