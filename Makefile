default:
	g++ *.cpp -o main -O1 -Wall -I include/ -L lib/ -lraylib -lopengl32 -lgdi32 -lwinmm
	