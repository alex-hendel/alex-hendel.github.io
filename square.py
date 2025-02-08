# a simple test program to take user input number and return that number squared

def take_input():
    while True:
        try:
            num = int(input("Enter a number: "))
            return num
        except ValueError:
            print("Invalid input!")

def calculate_square(n):
    square = n * n
    return square

if __name__=="__main__":
    n = take_input()
    return calculate_square(n)
