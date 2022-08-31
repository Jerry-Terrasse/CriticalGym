import os

def write(data: str, path: str) -> None:
	with open(path, 'w') as f:
		f.write(data)

with open('../../problems/vision/temp.md') as f:
	lines = f.readlines()

chapter = -1
problem = 0

f = open('temp.txt', 'w')

for line in lines:
	if line.startswith('#'):
		chapter += 1
		problem = 0
	if line.startswith('['):
		line = line.strip()
		path = f"{chapter}/{problem}"
		name = line.split('[')[1].split(']')[0]
		os.makedirs(path, exist_ok=True)
		# write(
		# 	f"请你完成{line}，并将**提交通过截图**和**源代码文件**上传。",
		# 	f'{path}/problem.md'
		# )
		f.write(f"insert into problems (`group`, chapter, `index`, path, name) values (3, {chapter}, {problem}, 'vision/{chapter}/{problem}', '{name}');\n")
		problem += 1