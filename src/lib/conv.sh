cat filters.txt | awk -F\" '{ print "env.addFilter " $2 " replace" }'
