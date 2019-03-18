import sys
import h5py
import numpy as np

f = h5py.File(sys.argv[1], 'r+')
D = np.transpose(f['data/signal'])
f.create_dataset('data/signal_b', D.shape, data=D)
del f['data/signal']
f.move('data/signal_b', 'data/signal')
f.close()