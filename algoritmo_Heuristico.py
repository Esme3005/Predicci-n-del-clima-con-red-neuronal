import random

def funcion_objetivo(x):
    return -x**2 / 2 + 50 * x

def algoritmo_heuristico(iteraciones=50, rango=(-100, 100)):
    mejorX = None
    mejorValor = float('-inf')
    for i in range(iteraciones):
        x = random.uniform(*rango)
        valor = funcion_objetivo(x)
        if valor > mejorValor and valor >= 0:        # Solo considerar como mejor valor si es mayor al anterior y positivo
            mejorValor = valor
            mejorX = x
            print(f"Iteración {i+1}: Nuevo mejor valor encontrado -> x = {mejorX:.2f}, valor = {mejorValor:.2f}")
    print(f"\nMejor x encontrado: {mejorX:.2f}")
    print(f"Valor máximo de la función: {mejorValor:.2f}")
    return mejorX, mejorValor

if __name__ == "__main__":
    algoritmo_heuristico()
    
    '''Esmeralda Betsabet Montalvo Martinez'''