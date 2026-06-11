FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
RUN mkdir -p wwwroot/uploads
COPY --from=build /app/publish .
EXPOSE 10000
ENTRYPOINT ["dotnet", "HelvetiaApi.dll"]
